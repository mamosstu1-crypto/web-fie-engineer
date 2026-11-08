import { LOCALE_ID, Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ViewChildren,
    QueryList, TemplateRef, ChangeDetectorRef, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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
import { MatTableDataSource } from '@angular/material/table';
import { DataPosition } from '../page.types';

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
    public formData: FormGroup;
    public createResp: any[] = [];
    public updateResp: any[] = [];
    public deleteResp: any[] = [];
    public flashMessage: 'success' | 'error' | null = null;
    public isLoading: boolean = false;
    public isEdit: boolean = false;
    public dialogWidth: number = 40; // scale in %

    @ViewChildren(DataTableDirective) dtElements: QueryList<DataTableDirective>;
    @ViewChild(MatPaginator) _paginator: MatPaginator;
    @ViewChild('Dialog') Dialog: TemplateRef<any>;
    @ViewChild('status') status: TemplateRef<any>;

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private start: number;
    public dtOptions: DataTables.Settings = {};
    public dtOptions2: DataTables.Settings = {};
    public dtOptions3: DataTables.Settings = {};
    public dtOptions4: DataTables.Settings = {};

    public dataRow: any[] = [];
    public dataRow2: any[]= [];
    public dataRow3: any[]= [];
    public dataRow4: any[]= [];

    public dataGrid: any[];

    dataSource: MatTableDataSource<DataPosition>;

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
            name: '',
            id: ['', Validators.required],
            status:'',
        }); this._formDataService.setFormGroup('formData', this.formData);
    }
    ngAfterViewInit(): void {
        throw new Error('Method not implemented.');
    }
    ngOnDestroy(): void {
        throw new Error('Method not implemented.');
    }

    // Lifecycle Hooks
    ngOnInit(): void {
        this._activatedRoute.queryParams.subscribe(params => {
            this.start = params['start'];
        });
        this.loadTable();
        // this.loadTable2();
        // this.loadTable3();
        // this.loadTable4();
    }
    currentStart: number = 0;

    pages = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    loadTable(): void {
        this.dtOptions = {
            pagingType: 'full_numbers', pageLength: 10,
            serverSide: true, processing: true, responsive: true, displayStart: this.start,
            language: { url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/th.json', },
            ajax: (dataTablesParameters: any, callback) => {
                this.currentStart = dataTablesParameters.start;
                this._Service.getPage(dataTablesParameters).subscribe((resp) => {
                    this.dataRow = resp.data; this.pages.current_page = resp.current_page;
                    this.pages.last_page = resp.last_page; this.pages.per_page = resp.per_page;
                    if (resp.current_page > 1) { this.pages.begin = resp.per_page * (resp.current_page - 1); }
                    else { this.pages.begin = 0; }

                    callback({ recordsTotal: resp.total, recordsFiltered: resp.total, data: [], });
                    this._changeDetectorRef.markForCheck();
                });
            },
        };
    }

    // pages2 = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    // loadTable2(): void {
    //     this.dtOptions2 = {
    //         pagingType: 'full_numbers', pageLength: 10,
    //         serverSide: true, processing: true, responsive: true, displayStart: this.start,
    //         language: { url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/th.json', },
    //         ajax: (dataTablesParameters: any, callback) => {
    //             this.currentStart = dataTablesParameters.start;
    //             this._Service.getPage2(dataTablesParameters).subscribe((resp) => {
    //                 this.dataRow2 = resp.data; this.pages2.current_page = resp.current_page;
    //                 this.pages2.last_page = resp.last_page; this.pages2.per_page = resp.per_page;
    //                 if (resp.current_page > 1) { this.pages2.begin = resp.per_page * (resp.current_page - 1); }
    //                 else { this.pages2.begin = 0; }

    //                 callback({ recordsTotal: resp.total, recordsFiltered: resp.total, data: [], });
    //                 this._changeDetectorRef.markForCheck();
    //             });
    //         },
    //     };
    // }
    // pages3 = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    // loadTable3(): void {
    //     this.dtOptions3 = {
    //         pagingType: 'full_numbers', pageLength: 10,
    //         serverSide: true, processing: true, responsive: true, displayStart: this.start,
    //         language: { url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/th.json', },
    //         ajax: (dataTablesParameters: any, callback) => {
    //             this.currentStart = dataTablesParameters.start;
    //             this._Service.getPage3(dataTablesParameters).subscribe((resp) => {
    //                 this.dataRow3 = resp.data; this.pages3.current_page = resp.current_page;
    //                 this.pages3.last_page = resp.last_page; this.pages3.per_page = resp.per_page;
    //                 if (resp.current_page > 1) { this.pages3.begin = resp.per_page * (resp.current_page - 1); }
    //                 else { this.pages3.begin = 0; }

    //                 callback({ recordsTotal: resp.total, recordsFiltered: resp.total, data: [], });
    //                 this._changeDetectorRef.markForCheck();
    //             });
    //         },
    //     };
    // }

    // pages4 = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    // loadTable4(): void {
    //     this.dtOptions4 = {
    //         pagingType: 'full_numbers', pageLength: 10,
    //         serverSide: true, processing: true, responsive: true, displayStart: this.start,
    //         language: { url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/th.json', },
    //         ajax: (dataTablesParameters: any, callback) => {
    //             this.currentStart = dataTablesParameters.start;
    //             this._Service.getPage4(dataTablesParameters).subscribe((resp) => {
    //                 this.dataRow4 = resp.data; this.pages4.current_page = resp.current_page;
    //                 this.pages4.last_page = resp.last_page; this.pages4.per_page = resp.per_page;
    //                 if (resp.current_page > 1) { this.pages4.begin = resp.per_page * (resp.current_page - 1); }
    //                 else { this.pages4.begin = 0; }

    //                 callback({ recordsTotal: resp.total, recordsFiltered: resp.total, data: [], });
    //                 this._changeDetectorRef.markForCheck();
    //             });
    //         },
    //     };
    // }

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
    openStatus(): void {
        const dialogRef = this._matDialog.open(this.status, {
            width: '40%',
        });

        dialogRef.afterClosed().subscribe(result => {
        });
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
}
