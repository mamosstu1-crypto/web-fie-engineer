import {
    LOCALE_ID,
    Component,
    OnInit,
    AfterViewInit,
    OnDestroy,
    ViewChild,
    ViewChildren,
    QueryList,
    TemplateRef,
    ChangeDetectorRef,
    ChangeDetectionStrategy,
    HostListener,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { distinctUntilChanged, lastValueFrom, Observable, Subject } from 'rxjs';
import { fuseAnimations } from '@fuse/animations';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Service } from '../page.service';
import { DataTableDirective } from 'angular-datatables';
import {
    UtilityService,
    DATE_TH_FORMATS,
    CustomDateAdapter,
} from 'app/app.utility-service';
import {
    DateAdapter,
    MAT_DATE_FORMATS,
    MAT_DATE_LOCALE,
} from '@angular/material/core';
import { FormDataService } from 'app/modules/matdynamic/form-data.service';
import { environment } from 'environments/environment';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { MatTabsModule } from '@angular/material/tabs';
import { L } from '@angular/cdk/keycodes';

@Component({
    selector: 'list',
    templateUrl: './list.component.html',
    styleUrls: ['./list.component.scss'],
    providers: [
        { provide: DateAdapter, useClass: CustomDateAdapter },
        { provide: MAT_DATE_FORMATS, useValue: DATE_TH_FORMATS },
        { provide: LOCALE_ID, useValue: 'th-TH-u-ca-gregory' },
        { provide: MAT_DATE_LOCALE, useValue: 'th-TH' },
    ],
    animations: fuseAnimations,
})
export class ListComponent implements OnInit, AfterViewInit, OnDestroy {
    // Properties and ViewChilds
    public dtOptions: DataTables.Settings = {};

    public formData: FormGroup;
    public createResp: any[] = [];
    public updateResp: any[] = [];
    public deleteResp: any[] = [];
    type: string = '';

    public flashMessage: 'success' | 'error' | null = null;
    public isLoading: boolean = false;
    public currentStart: number = 0;
    public isEdit: boolean = false;
    public dialogWidth: number = 40; // scale in %
    public selectedTabIndex: number = 0;

    public listInsurType: any[] = [];
    private user: any;

    @ViewChildren(DataTableDirective) dtElements: QueryList<DataTableDirective>;
    @ViewChild(MatPaginator) _paginator: MatPaginator;
    @ViewChild('Dialog') Dialog: TemplateRef<any>;

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private start: number;
    defaultEndDate: Date;

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseConfirm: FuseConfirmationService,
        private _formBuilder: FormBuilder,
        private _Service: Service,
        private _matDialog: MatDialog,
        private _activatedRoute: ActivatedRoute,
        private _formDataService: FormDataService,
        private _US: UtilityService
    ) {
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.formData = this._formBuilder.group({
            id: ['', Validators.required],
            result: [''],
            startDate: [''],
            endDate: [''],
            transaction_status: [''],
            paid_type_debt: [''],
            paid_date: [''],
        });
        this._formDataService.setFormGroup('formData', this.formData);
    }

    // Lifecycle Hooks
    async ngOnInit(): Promise<void> {
        this._activatedRoute.queryParams.subscribe(
            (params) => (this.start = params['start'])
        );
        this.loadTable();

        // this.formData.get('startDate')?.valueChanges.subscribe(() => {
        //     this.rerender();
        // });
        // this.formData.get('endDate')?.valueChanges.subscribe(() => {
        //     this.rerender();
        // });
        this.formData
            .get('startDate')
            ?.valueChanges.pipe(distinctUntilChanged())
            .subscribe(() => {
                this.rerender();
            });
        this.formData
            .get('endDate')
            ?.valueChanges.pipe(distinctUntilChanged())
            .subscribe(() => {
                this.rerender();
            });
    }
    ngAfterViewInit(): void {}
    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    onTabChange(event: MatTabChangeEvent): void {
        const index = event.index; // Extract the index from the MatTabChangeEvent

        switch (index) {
            case 1:
                this.type = 'adddebt';
                break;
            case 2:
                this.type = 'reducedebt';
                break;
            case 3:
                this.type = 'closedebt';
                break;
            default:
                this.type = '';
        }
        this.rerender();
    }

    public dataRow: any[] = [];
    pages = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    loadTable(): void {
        const that = this;
        this.dtOptions = {
            pagingType: 'full_numbers',
            pageLength: 25,
            serverSide: true,
            processing: true,
            order: [[2, 'desc']],
            language: {
                url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/th.json',
            },
            ajax: (dataTablesParameters: any, callback) => {
                dataTablesParameters.status = this.type;
                dataTablesParameters.date_start = this.formData.get('startDate')?.value;
                dataTablesParameters.date_end = this.formData.get('endDate')?.value;
                dataTablesParameters.branch_id =
                    (this.user?.employees ?? this.user?.Employees)?.branch_id ?? null;

                // if (dataTablesParameters.order && dataTablesParameters.order.length > 0) {
                //     const order = dataTablesParameters.order[0];
                //     const column = dataTablesParameters.columns[order.column];
                //     dataTablesParameters.sortField = column.data;
                //     dataTablesParameters.sortOrder = order.dir === 'asc' ? 1 : -1;
                // }
                that._Service
                    .getPage_invoice(dataTablesParameters)
                    .subscribe((resp: any) => {
                        this.dataRow = resp.data;

                        this.pages.current_page = resp.current_page;
                        this.pages.last_page = resp.last_page;
                        this.pages.per_page = resp.per_page;
                        this.pages.begin =
                            resp.current_page > 1
                                ? resp.per_page * (resp.current_page - 1)
                                : 0;

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

    // CRUD Operations
    create(): void {
        this._US.createItem(
            this._Service,
            this._fuseConfirm,
            this.submitForm.bind(this),
            this.createResp
        );
    }
    // update(): void { this._US.updateItem(this.formData, this._Service, this._fuseConfirm, this.submitForm.bind(this), this.updateResp); }
    update(): void {
        this._US.confirmAction(
            'แก้ไขรายการ',
            'คุณต้องการแก้ไขรายการใช่หรือไม่',
            this._fuseConfirm,
            () => {
                this._Service
                    .update_type(this.formData.value.id, this.formData.value)
                    .subscribe({
                        next: (resp) => {
                            this.updateResp = resp;
                            this.rerender();
                            this.closeDialog();
                        },
                        error: (err) => {
                            console.error('เกิดข้อผิดพลาดขณะอัปเดต:', err);
                        },
                    });
            }
        );
    }
    delete(id: any): void {
        this._US.deleteItem(
            id,
            this._Service,
            this._fuseConfirm,
            this.rerender.bind(this),
            this.deleteResp
        );
    }

    /* Date format (moment to json) */
    onDateChange(event: any, controlName: string, formName: FormGroup): void {
        this._US.onDateChange(event, controlName, formName);
    }
    onDateInput(event: any): void {
        this._US.onDateInput(event);
    }

    // Dialog Operations
    openDialog(item?: any, event?: Event): void {
        if (event) {
            event.stopPropagation();
        }
        if (item) {
            this.formData.patchValue({
                ...item,
                transaction_status: item.transaction_status,
            });
            this.isEdit = true;
        } else {
            this.isEdit = false;
        }
        this._US.openDialog(
            this._matDialog,
            this.Dialog,
            this.dialogWidth,
            this.formData
        );
    }
    closeDialog(Ref?: any): void {
        Ref ? this._US.closeDialog(Ref) : this._matDialog.closeAll();
    }

    // Utility Methods
    // rerender(): void {
    //     this.dtElements.forEach((dtElement: DataTableDirective) => {
    //         dtElement.dtInstance.then((dtInstance: any) =>
    //             dtInstance.ajax.reload()
    //         );
    //     });
    // }
    rerender(): void {
        const dtElement = this.dtElements.first;
        if (dtElement) {
            dtElement.dtInstance.then((dtInstance: any) =>
                dtInstance.ajax.reload()
            );
        }
    }

    showEdit(): boolean {
        return this._US.hasPermission(1);
    }
    showDelete(): boolean {
        return this._US.hasPermission(1);
    }
    showFlashMessage(type: 'success' | 'error'): void {
        this._US.showFlashMessage(type, this._changeDetectorRef, this);
    }

    private submitForm(action: (formData: FormData) => Observable<any>): void {
        this._US.submitForm(
            this.formData,
            action,
            this._changeDetectorRef,
            this._fuseConfirm,
            this,
            this.rerender.bind(this),
            this.closeDialog.bind(this)
        );
    }

    pdf() {
        const startDate =
            this.formData.get('startDate')?.value ||
            this._US.pdfDefaultDate('firstDayOfMonth');
        const endDate =
            this.formData.get('endDate')?.value ||
            this._US.pdfDefaultDate('lastDayOfMonth');
        const formatSDate = this._US.pdfDateFormat(startDate);
        const formatEDate = this._US.pdfDateFormat(endDate);

        const branchId =
            (this.user?.employees ?? this.user?.Employees)?.branch_id ?? '';
        window.open(
            `${environment.API_URL}/api/report/reportExportPDFcheck_car_report?start_date=${formatSDate}&end_date=${formatEDate}&branch_id=${branchId}`
        );
    }

    pdfDay() {
        const startDate =
            this.formData.get('startDate')?.value ||
            this._US.pdfDefaultDate('firstDayOfMonth');
        const formatSDate = this._US.pdfDateFormat(startDate);
        window.open(
            `${environment.API_URL}/api/report/reportExportPDFday?date=${formatSDate}`,
            '_blank'
        );
    }

    pdfMonth() {
        const startDate =
            this.formData.get('startDate')?.value ||
            this._US.pdfDefaultDate('firstDayOfMonth');
        const endDate =
            this.formData.get('endDate')?.value ||
            this._US.pdfDefaultDate('lastDayOfMonth');
        const formatSDate = this._US.pdfDateFormat(startDate);
        const formatEDate = this._US.pdfDateFormat(endDate);
        window.open(
            `${environment.API_URL}/api/report/reportExportPDFmonth?start_date=${formatSDate}&end_date=${formatEDate}`,
            '_blank'
        );
    }
}
