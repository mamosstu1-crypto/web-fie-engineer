import { LOCALE_ID, Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ViewChildren,
    QueryList, TemplateRef, ChangeDetectorRef, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { lastValueFrom, Observable, Subject,ReplaySubject,takeUntil } from 'rxjs';
import { fuseAnimations } from '@fuse/animations';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Service } from '../page.service';
import { DataTableDirective } from 'angular-datatables';
import { UtilityService, DATE_TH_FORMATS, CustomDateAdapter } from 'app/app.utility-service';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { FormDataService } from 'app/modules/matdynamic/form-data.service';
import { FormControl } from '@angular/forms';
import { map, startWith } from 'rxjs/operators';

@Component({
    selector: 'list',
    templateUrl: './list.component.html',
    styleUrls: ['./list.component.scss'],
    providers: [
        { provide: DateAdapter, useClass: CustomDateAdapter },
        { provide: MAT_DATE_FORMATS, useValue: DATE_TH_FORMATS },
        { provide: LOCALE_ID, useValue: 'th-TH-u-ca-gregory' },
        { provide: MAT_DATE_LOCALE, useValue: 'th-TH' }
    ],
    animations: fuseAnimations,
})
export class ListComponent implements OnInit, AfterViewInit, OnDestroy {

    // Properties and ViewChilds
    public dtOptions: DataTables.Settings = {};
    public dataRow: any[] = [];
    public formData: FormGroup;
    public createResp: any[] = [];
    public updateResp: any[] = [];
    public deleteResp: any[] = [];
    public flashMessage: 'success' | 'error' | null = null;
    public isLoading: boolean = false;
    public currentStart: number = 0;
    public pages = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    public isEdit: boolean = false;
    public dialogWidth: number = 40; // scale in %

    @ViewChildren(DataTableDirective) dtElements: QueryList<DataTableDirective>;
    @ViewChild(MatPaginator) _paginator: MatPaginator;
    @ViewChild('Dialog') Dialog: TemplateRef<any>;

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private start: number;

    // public listDocType: any = [];
    public listDoc: any = [];
    public listCustomer: any = [];

    public docsControl = new FormControl();
    public filteredDocs: Observable<any[]>;
    public cusControl = new FormControl();
    public filteredCustomer: Observable<any[]>;

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseConfirm: FuseConfirmationService,
        private _formBuilder: FormBuilder,
        private _Service: Service,
        private _matDialog: MatDialog,
        private _activatedRoute: ActivatedRoute,
        private _formDataService: FormDataService,
        private _US: UtilityService,
    ) {
        this.formData = this._formBuilder.group({
            id: '',
            docs_id: '',
            doc_name: '',
            customer_id: '',
            customer_name: '',
            total_qty: '',
            price: '',
        });
        this._formDataService.setFormGroup('formData', this.formData);

    }

    // Lifecycle Hooks
    async ngOnInit(): Promise<void> {
        this._activatedRoute.queryParams.subscribe(params => this.start = params['start']);
        this.loadTable();

        this._Service.getDoc().subscribe((resp) => { this.listDoc = resp.data; });
        this._Service.getCustomer().subscribe((resp) => { this.listCustomer = resp.data; });
        this.filteredDocs = this.docsControl.valueChanges.pipe(
            startWith(''),
            map(value => this._filterDocs(value || ''))
        );
        this.filteredCustomer = this.cusControl.valueChanges.pipe(
            startWith(''),
            map(value => this._filterCus(value || ''))
        );
    }
    ngAfterViewInit(): void {}
    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // DataTable Initialization
    // loadTable(): void { this._US.loadTable(this, this._Service, this._changeDetectorRef, this.pages, this, this.start, this); }
    loadTable(): void {
        this.dtOptions = {
            pagingType: 'full_numbers', pageLength: 10, displayStart: this.start,
            serverSide: true, processing: true, responsive: true, order: [[0, 'desc']],
            language: { url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/th.json', },
            ajax: (dataTablesParameters: any, callback) => {
                this.currentStart = dataTablesParameters.start;
                const order = dataTablesParameters.order.length > 0
                    ? dataTablesParameters.order[0]
                    : { column: 0, dir: 'desc' };
                this._Service.getPage({ ...dataTablesParameters, order: [order] }).subscribe((resp) => {
                    this.dataRow = resp.data;
                    this.pages.current_page = resp.current_page;
                    this.pages.last_page = resp.last_page;
                    this.pages.per_page = resp.per_page;

                    if (resp.current_page > 1) { this.pages.begin = resp.per_page * (resp.current_page - 1);
                    } else { this.pages.begin = 0; }

                    callback({ recordsTotal: resp.total, recordsFiltered: resp.total, data: [] });
                    this._changeDetectorRef.markForCheck();
                });
            },
        };
    }

    // CRUD Operations
    create(): void { this._US.createItem(this._Service, this._fuseConfirm, this.submitForm.bind(this), this.createResp); }
    update(): void { this._US.updateItem(this.formData, this._Service, this._fuseConfirm, this.submitForm.bind(this), this.updateResp); }
    delete(id: any): void { this._US.deleteItem(id, this._Service, this._fuseConfirm, this.rerender.bind(this), this.deleteResp); }

    // Dialog Operations
    openDialog(item?: any, event?: Event): void {
        if (event) { event.stopPropagation(); }
        item ? (this.formData.patchValue(item), this.isEdit = true) : (this.isEdit = false);
        this._US.openDialog(this._matDialog, this.Dialog, this.dialogWidth, this.formData);
    }
    closeDialog(Ref?: any): void {
        (Ref) ? (this._US.closeDialog(Ref)) : (this._matDialog.closeAll())
        this.formData.reset();
        this.docsControl.reset();
        this.cusControl.reset();
    }

    // Utility Methods
    rerender(): void { this.dtElements.forEach((dtElement: DataTableDirective) =>
        { dtElement.dtInstance.then((dtInstance: any) => dtInstance.ajax.reload()); });
    }
    showEdit(): boolean { return this._US.hasPermission(1); }
    showDelete(): boolean { return this._US.hasPermission(1); }
    showFlashMessage(type: 'success' | 'error'): void { this._US.showFlashMessage(type, this._changeDetectorRef, this); }

    private submitForm(action: (formData: FormData) => Observable<any>): void { this._US.submitForm(
        this.formData, action, this._changeDetectorRef, this._fuseConfirm, this, this.rerender.bind(this), this.closeDialog.bind(this)
    );}

    private _filterDocs(value: any): any[] {
        let filterValue = '';
        if (typeof value === 'string') {
            filterValue = value.toLowerCase();
        } else if (value && value.name) {
            filterValue = value.name.toLowerCase();
        }

        return this.listDoc.filter(doc =>
            doc.name.toLowerCase().includes(filterValue) ||
            doc.no.toLowerCase().includes(filterValue)
        );
    }

    private onDocSelected(event: any): void {
        const selectedDoc = event.option.value;

        this.formData.patchValue({
            docs_id: selectedDoc.id,
            doc_name: selectedDoc.name
        });

        this.docsControl.setValue(selectedDoc.name);
    }

    private _filterCus(value: any): any[] {
        let filterValue = '';
        if (typeof value === 'string') {
            filterValue = value.toLowerCase();
        } else if (value && value.name) {
            filterValue = value.name.toLowerCase();
        }

        return this.listCustomer.filter(cus =>
            cus.name.toLowerCase().includes(filterValue)
        );
    }

    private onCusSelected(event: any): void {
        const selectedCus = event.option.value;
        this.formData.patchValue({
            customer_id: selectedCus.id,
            customer_name: selectedCus.name
        });
        this.cusControl.setValue(selectedCus.name);
    }
}
