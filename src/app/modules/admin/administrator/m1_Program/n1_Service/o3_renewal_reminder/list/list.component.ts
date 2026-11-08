import { LOCALE_ID, Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ViewChildren,
    QueryList, TemplateRef, ChangeDetectorRef, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom, Observable, Subject } from 'rxjs';
import { fuseAnimations } from '@fuse/animations';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Service } from '../page.service';
import { DataTableDirective } from 'angular-datatables';
import { UtilityService, DATE_TH_FORMATS, CustomDateAdapter } from 'app/app.utility-service';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { FormDataService } from 'app/modules/matdynamic/form-data.service';
import { AuthService } from 'app/core/auth/auth.service';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { values } from 'lodash';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { DialogDetail } from '../dialog-payment/dialog.component';
import { environment } from 'environments/environment';

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
    public dtOptions1: DataTables.Settings = {};
    private pages1 = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    public dataRow1: any[] = [];

    public formData: FormGroup;
    public createResp: any[] = [];
    public updateResp: any[] = [];
    public deleteResp: any[] = [];

    public flashMessage: 'success' | 'error' | null = null;
    public isLoading: boolean = false;
    public currentStart: number = 0;
    public isEdit: boolean = false;
    public dialogWidth: number = 40; // scale in %
    public selectedTabIndex: number = 0;

    @ViewChildren(DataTableDirective) dtElements: QueryList<DataTableDirective>;
    @ViewChild(MatPaginator) _paginator: MatPaginator;
    @ViewChild('Dialog') Dialog: TemplateRef<any>;

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private start: number;
    private _formDataService: any;
    public status: FormGroup;
    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseConfirm: FuseConfirmationService,
        private _formBuilder: FormBuilder,
        // private _Service: PermissionService,
        private _Service: Service,
        private _matDialog: MatDialog,
        private _router: Router,
        private _activatedRoute: ActivatedRoute,
        private _authService: AuthService,
        private _US: UtilityService,
    ) {
        this.formData = this._formBuilder.group({
            tax_vehicle: [''],
            ids: this._formBuilder.array([]),

            startDate: [''],
            endDate: [''],
        });
    }

    ngOnInit(): void {
        this._activatedRoute.queryParams.subscribe(params => {
            this.start = params['start'];
        });
        this.loadTable('check', 1);

        this.formData.get('startDate')?.valueChanges.subscribe(() => { this.rerender(); });
        this.formData.get('endDate')?.valueChanges.subscribe(() => { this.rerender(); });
    }

    onTabChange():void {
        const idsArray = this.formData.get('ids') as FormArray;
        idsArray.clear();
    }

    private loginBranchId(): string | number | null {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        return (user?.employees ?? user?.Employees)?.branch_id ?? null;
    }

    loadTable(status: string, tableIndex: number): void {
        const dtOptionsKey = `dtOptions${tableIndex}`;
        const pagesKey = `pages${tableIndex}`;

        this[dtOptionsKey] = {
            pagingType: 'full_numbers', pageLength: 10, displayStart: this.start, order: [],
            serverSide: true, processing: true, responsive: true,
            language: { url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/th.json' },
            ajax: (dataTablesParameters: any, callback) => {
                const user = JSON.parse(localStorage.getItem('user') || 'null');
                dataTablesParameters.branch_id =
                    (user?.employees ?? user?.Employees)?.branch_id ?? null;
                this.currentStart = dataTablesParameters.start;
                dataTablesParameters.tax_vehicle = status;
                dataTablesParameters.start_date = this.formData.get('startDate')?.value;
                dataTablesParameters.end_date = this.formData.get('endDate')?.value;

                const order = dataTablesParameters.order.length > 0
                    ? dataTablesParameters.order[0]
                    : { column: 0, dir: 'desc' };
                this._Service.getPage({ ...dataTablesParameters, order: [order] }).subscribe((resp) => {
                    this[`dataRow${tableIndex}`] = resp.data;
                    this[pagesKey].current_page = resp.current_page;
                    this[pagesKey].last_page = resp.last_page;
                    this[pagesKey].per_page = resp.per_page;

                    (resp.current_page > 1)
                        ? this[pagesKey].begin = resp.per_page * (resp.current_page - 1)
                        : this[pagesKey].begin = 0;

                    callback({
                        recordsTotal: resp.total,
                        recordsFiltered: resp.total,
                        data: [],
                    });
                    this._changeDetectorRef.markForCheck();
                });
            },
        };
    }

    ngAfterViewInit(): void {}
    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // CRUD Operations
    create(): void { this._US.createItem(this._Service, this._fuseConfirm, this.submitForm.bind(this), this.createResp); }
    update(): void { this._US.updateItem(this.formData, this._Service, this._fuseConfirm, this.submitForm.bind(this), this.updateResp); }
    delete(id: any): void { this._US.deleteItem(id, this._Service, this._fuseConfirm, this.rerender.bind(this), this.deleteResp); }

    /* Date format (moment to json) */
    onDateChange(event: any, controlName: string, formName: FormGroup): void {
        this._US.onDateChange(event, controlName, formName);
    }
    onDateInput(event: any): void { this._US.onDateInput(event); }

    // Dialog Operations
    openDialog(item?: any, event?: Event): void {
        if (event) { event.stopPropagation(); }
        item ? (this.formData.patchValue(item), this.isEdit = true) : (this.isEdit = false);
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

    openDialogdetail(item?: any, event?: Event){
        const dialogRef = this._matDialog.open(DialogDetail, {
            width: '500vh',
            maxWidth: '90%',
            data: {
                values:item,
            }
        });

        dialogRef.afterClosed().subscribe((result) => {
            this.rerender();
        });
    }

    pdf(): void {
        const startDate =
            this.formData.get('startDate')?.value ||
            this._US.pdfDefaultDate('firstDayOfMonth');
        const endDate =
            this.formData.get('endDate')?.value ||
            this._US.pdfDefaultDate('lastDayOfMonth');
        const formatSDate = this._US.pdfDateFormat(startDate);
        const formatEDate = this._US.pdfDateFormat(endDate);
        const branch_id = this.loginBranchId();

        window.open(
            `${environment.API_URL}/api/report/reportExportPDFextent_customer?start_date=${formatSDate}&end_date=${formatEDate}&branch_id=${branch_id}`,
            '_blank'
        );
    }

    excel(): void {
        const startDate =
            this.formData.get('startDate')?.value ||
            this._US.pdfDefaultDate('firstDayOfMonth');
        const endDate =
            this.formData.get('endDate')?.value ||
            this._US.pdfDefaultDate('lastDayOfMonth');
        const formatSDate = this._US.pdfDateFormat(startDate);
        const formatEDate = this._US.pdfDateFormat(endDate);
        const branch_id = this.loginBranchId();

        window.open(
            `${environment.API_URL}/api/report/excel/extent_customer?start_date=${formatSDate}&end_date=${formatEDate}&branch_id=${branch_id}`,
            '_blank'
        );
    }
}
