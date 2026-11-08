import { LOCALE_ID, Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ViewChildren,
    QueryList, TemplateRef, ChangeDetectorRef, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { lastValueFrom, Observable, Subject } from 'rxjs';
import { fuseAnimations } from '@fuse/animations';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Service } from '../page.service';
import { DataTableDirective } from 'angular-datatables';
import { UtilityService, DATE_TH_FORMATS, CustomDateAdapter } from 'app/app.utility-service';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { FormDataService } from 'app/modules/matdynamic/form-data.service';
import { map, startWith } from 'rxjs/operators';
import moment from 'moment';

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
    public dialogWidth: number = 60; // scale in %

    @ViewChildren(DataTableDirective) dtElements: QueryList<DataTableDirective>;
    @ViewChild(MatPaginator) _paginator: MatPaginator;
    @ViewChild('Dialog') Dialog: TemplateRef<any>;

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private start: number;
    public transactionType: string = '';

    public listDocData: any = [];
    public listInspection: any = [];

    public docControl = new FormControl();
    public filteredDoc: Observable<any[]>;
    branch_id: number;

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
            id: [''],
            doc_customer_id: [''],
            doc_id: [''],
            branch_id: [''],
            inspection_id: [''],
            date: [''],
            transaction_type: [''],
            quantity: [''],
            remark: [''],
        }); this._formDataService.setFormGroup('formData', this.formData);
        this.branch_id = JSON.parse(localStorage.getItem('user'))?.employees?.branch_id;
    }

    // Lifecycle Hooks
    async ngOnInit(): Promise<void> {
        this._activatedRoute.queryParams.subscribe(params => this.start = params['start']);
        this.loadTable();

        this._Service.getDocData().subscribe((resp) => {
            this.listDocData = resp.data;
         });
        this._Service.getInspection().subscribe((resp) => { this.listInspection = resp; });

        this.filteredDoc = this.docControl.valueChanges.pipe(
            startWith(''),
            map(value => this._filterDoc(value))
        );
    }
    ngAfterViewInit(): void {}
    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }
    onTabChange(event: any): void {
        if (event.index === 0) {
          this.transactionType = '';
        } else if (event.index === 1) {
          this.transactionType = 'Deposit';
        } else if (event.index === 2) {
          this.transactionType = 'Withdraw';
        }
        this.loadTable();
        this.rerender();
    }

    loadTable(): void {
        this.dtOptions = {
            pagingType: 'full_numbers', pageLength: 10, displayStart: this.start,
            serverSide: true, processing: true, responsive: true, order: [[0, 'desc']],
            language: { url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/th.json', },
            ajax: (dataTablesParameters: any, callback) => {
                this.currentStart = dataTablesParameters.start;
                dataTablesParameters.transaction_type = this.transactionType;
                dataTablesParameters.branch_id = this.branch_id;
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

    /* Date format (moment to json) */
    onDateChange(event: any, controlName: string, formName: FormGroup): void {
        this._US.onDateChange(event, controlName, formName);
    }
    onDateInput(event: any): void { this._US.onDateInput(event); }

    // CRUD Operations
    create(): void { this._US.createItem(this._Service, this._fuseConfirm, this.submitForm.bind(this), this.createResp); }
    update(): void { this._US.updateItem(this.formData, this._Service, this._fuseConfirm, this.submitForm.bind(this), this.updateResp); }
    delete(id: any): void { this._US.deleteItem(id, this._Service, this._fuseConfirm, this.rerender.bind(this), this.deleteResp); }

    // Dialog Operations
    openDialog(item?: any, event?: Event): void {
        if (event) { event.stopPropagation(); }
        item ? (this.formData.patchValue(item), this.isEdit = true) : (this.isEdit = false);
        // this.formData.get('transaction_type')?.[this.isEdit ? 'disable' : 'enable']();
        this._US.openDialog(this._matDialog, this.Dialog, this.dialogWidth, this.formData);
    }
    closeDialog(Ref?: any): void { (Ref) ? (this._US.closeDialog(Ref)) : (this._matDialog.closeAll()) }

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

    private _filterDoc(value: string): any[] {
        const filterValue = value.toString().toLowerCase();

        // return this.listDocData.filter(item =>
        //     item?.name.toLowerCase().includes(filterValue) ||
        //     item?.no.toLowerCase().includes(filterValue)
        // );
        return this.listDocData.filter(item =>
            (item?.name?.toLowerCase().includes(filterValue) ||
             item?.no?.toLowerCase().includes(filterValue))
          );
    }
    onDocSelected(event: any): void {
        const selectedDoc = event.option.value;

        this.formData.patchValue({
            doc_id: selectedDoc.id,
            branch_id: this.branch_id,
        });

        this.docControl.setValue(`${selectedDoc.no} ${selectedDoc.name}`);
    }
}
