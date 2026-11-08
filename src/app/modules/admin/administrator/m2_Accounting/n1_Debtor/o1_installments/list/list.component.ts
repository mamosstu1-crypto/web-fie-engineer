import { LOCALE_ID, Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ViewChildren,
    QueryList, TemplateRef, ChangeDetectorRef, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom, Observable, Subject } from 'rxjs';
import { fuseAnimations } from '@fuse/animations';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Service } from '../page.service';
import { DataTableDirective } from 'angular-datatables';
import { UtilityService, DATE_TH_FORMATS, CustomDateAdapter } from 'app/app.utility-service';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { FormDataService } from 'app/modules/matdynamic/form-data.service';
import { data } from 'jquery';
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

    selectedDate: any; // สำหรับวันที่เดียว
    dateRange: { start: Date | null, end: Date | null } = { start: null, end: null };

    // Properties and ViewChilds
    public dtOptions: DataTables.Settings = {};
    public dataRow: any[] = [];
    public formData: FormGroup;
    public formData_dialog: FormGroup;
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
    @ViewChild('EditDialog') EditDialog: TemplateRef<any>;
    @ViewChild('paidType') paidType: TemplateRef<any>;

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private start: number;
    dialog: any;

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseConfirm: FuseConfirmationService,
        private _formBuilder: FormBuilder,
        private _Service: Service,
        private _matDialog: MatDialog,
        private _activatedRoute: ActivatedRoute,
        private _formDataService: FormDataService,
        private _US: UtilityService,
        private _router: Router,
        private _fuseConfirmationService: FuseConfirmationService,
    ) {
        const currentDate = new Date();
        const nextMonth = new Date(currentDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        this.formData = this._formBuilder.group({
            id: ['', Validators.required],
            no: '',
            vehicle_inspection_types_id: '',
            insurance_types_id: '',
            regeister_date: '',
            cc: '',
            weight: '',
            tax_due_date: '',
            tax_renewal_date: '',
            fuel_type: '',
            appointment: '',
            tax: '',
            type_document: '',
            status: '',
            tax_vehicle: '',
            vehicle_id: '',
            employee_id: '',
            branch_id: '',
            EMS: '',
            result: '',
            comments: '',
            total: '',
            discount: '',
            created_at: '',
            updated_at: '',
            license_plate: '',
            name: '',
            service_price: '',
            date: [new Date().toISOString().split('T')[0]],
            startDate: [currentDate],
            endDate: [nextMonth],

            service_transactions: this._formBuilder.array([]),
        });
        this._formDataService.setFormGroup('formData', this.formData);

        this.formData_dialog = this._formBuilder.group({
            doc_id: '',
            vehicle_id: '',
        });

        this.formData.get('startDate')?.valueChanges.subscribe(() => { this.rerender(); });
        this.formData.get('endDate')?.valueChanges.subscribe(() => { this.rerender(); });
    }

    // Lifecycle Hooks
    async ngOnInit(): Promise<void> {
        this._activatedRoute.queryParams.subscribe(params => this.start = params['start']);
        this.loadTable();
    }
    ngAfterViewInit(): void { }
    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // DataTable Initialization
    loadTable(): void {
        const status = "overdue";
        this.dtOptions = {
            pagingType: 'full_numbers', pageLength: 10, displayStart: this.start,
            serverSide: true, processing: true, responsive: true,
            language: { url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/th.json', },
            ajax: (dataTablesParameters: any, callback) => {
                this.currentStart = dataTablesParameters.start;
                dataTablesParameters.status = "remain";
                dataTablesParameters.order[0].dir = "desc";
                dataTablesParameters.start_date = this.formData.get('startDate')?.value;
                dataTablesParameters.end_date = this.formData.get('endDate')?.value;

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
    // CRUD Operations
    create(): void { this._US.createItem(this._Service, this._fuseConfirm, this.submitForm.bind(this), this.createResp); }
    delete(id: any): void { this._US.deleteItem(id, this._Service, this._fuseConfirm, this.rerender.bind(this), this.deleteResp); }

    get serviceTransactionsArray(): FormArray {
        return this.formData.get('service_transactions') as FormArray;
    }

    // addServiceTransaction(serviceName: string, servicePrice: number): void {
    //     const serviceTransactionGroup = this._formBuilder.group({
    //         service_name: [serviceName],
    //         service_price: [servicePrice]
    //     });
    //     this.serviceTransactionsArray.push(serviceTransactionGroup);
    // }

    addServiceTransaction(serviceName: string, servicePrice: number, status: number): void {
        const serviceTransactionGroup = this._formBuilder.group({
            service_name: [serviceName],
            service_price: [servicePrice],
            status: [status]
        });

        if (status === 0) { serviceTransactionGroup.get('service_price').disable(); }
        this.serviceTransactionsArray.push(serviceTransactionGroup);
    }

    /* Date format (moment to json) */
    onDateChange(event: any, controlName: string, formName: FormGroup): void {
        this._US.onDateChange(event, controlName, formName);
    }
    onDateInput(event: any): void { this._US.onDateInput(event); }

    // Dialog Operations
    openpaidType(item: any): void {
        this.formData_dialog.patchValue({
            doc_id: item.id,
            vehicle_id: item.vehicle_id
        });

        this._matDialog.open(this.paidType, {
            width: '60%',
        });
    }
    closeDialog(Ref?: any): void { (Ref) ? (this._US.closeDialog(Ref)) : (this._matDialog.closeAll()) }

    toggleServicePrice(serviceGroup: FormGroup): void {
        const statusControl = serviceGroup.get('status');
        const servicePriceControl = serviceGroup.get('service_price');

        if (statusControl.value === 0) {
            servicePriceControl.disable();
        } else {
            servicePriceControl.enable();
        }

        statusControl.valueChanges.subscribe(value => {
            if (value === 0) {
                servicePriceControl.disable();
            } else {
                servicePriceControl.enable();
            }
        });
    }

    // Utility Methods
    rerender(): void { this.dtElements.forEach((dtElement: DataTableDirective) =>
        { dtElement.dtInstance.then((dtInstance: any) => dtInstance.ajax.reload()); });
    }
    showEdit(): boolean { return this._US.hasPermission(1); }
    showDelete(): boolean { return this._US.hasPermission(1); }
    showFlashMessage(type: 'success' | 'error'): void { this._US.showFlashMessage(type, this._changeDetectorRef, this); }

    loadservice() {
        this._Service.getServices().subscribe(resp => {
            const services = resp;

            const serviceFormArray = this.formData.get('List_service_tran') as FormArray;
            this._changeDetectorRef.detectChanges();
        })
    }

    update(item: any): void {
        const id = item.id;
        this._router.navigate(['/bill_create/list'], {
            queryParams: { id: id },
            state: { data: item }
        });
    }


    get servicesFormArray(): FormArray {
        return this.formData.get('List_service_tran') as FormArray;
    }

    private submitForm(action: (formData: FormData) => Observable<any>): void {
        this._US.submitForm(
            this.formData, action, this._changeDetectorRef, this._fuseConfirm, this, this.rerender.bind(this), this.closeDialog.bind(this)
        );
    }

    formatDate(date: any): string {
        if (!date) return '';
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [year, month, day].join('-');
    }

    pdfDay() {
        const startDate = this.formData.get('startDate')?.value || this._US.pdfDefaultDate('firstDayOfMonth');
        const formatSDate = this._US.pdfDateFormat(startDate);
        window.open(`${environment.API_URL}/api/report/reportExportPDFday?date=${formatSDate}`, '_blank');
    }

    pdfMonth() {
        const startDate = this.formData.get('startDate')?.value || this._US.pdfDefaultDate('firstDayOfMonth');
        const endDate = this.formData.get('endDate')?.value || this._US.pdfDefaultDate('lastDayOfMonth');
        const formatSDate = this._US.pdfDateFormat(startDate);
        const formatEDate = this._US.pdfDateFormat(endDate);

        window.open(`${environment.API_URL}/api/report/reportExportPDFmonth?start_date=${formatSDate}&end_date=${formatEDate}`, '_blank');
    }

    printPDF1(id :any) { window.open(`${environment.API_URL}/api/license/${id}`); }
    printPDF2(id :any) { window.open(`${environment.API_URL}/api/license_image/${id}`); }
    printPDF3(id :any) { window.open(`${environment.API_URL}/api/report/ListPDFcheck_testLPG/${id}`); }
    printPDF4(id :any) { window.open(`${environment.API_URL}/api/report/exportPDF/certificate/${id}`); }
    printPDF5(id :any) { window.open(`${environment.API_URL}/api/report/report_cng/${id}`); }
    printallreceipt(id: any) { window.open(`${environment.API_URL}/api/report/exportPDF/allreceipt/${id}`); }

    getServicePrice(service: any[], service_id: number): string {
        if (!service || service.length === 0) {
            return '0';
        }
        const matchedService = service.find(item => item.service_id === service_id);
        return matchedService?.service_price ? matchedService.service_price : '0';
    }

    getGasTotal(service: any[]): string {
        const ids = [8, 9, 10, 11, 12];
        const total = ids.reduce((sum, id) => {
            const transaction = service.find(t => t.service_id === id );
            return sum + (transaction?.service_price || 0);
        }, 0);
        return total;
    }
    getotherTotal(service: any[]): string {
        const ids = [13, 15, 16];
        const total = ids.reduce((sum, id) => {
            const transaction = service.find(t => t.service_id === id );
            return sum + (transaction?.service_price || 0);
        }, 0);
        return total;
    }

    getTexTotal(service: any[]): string {
        const ids = [3, 4, 5, 6];
        const total = ids.reduce((sum, id) => {
            const transaction = service.find(t => t.service_id === id );
            return sum + (transaction?.service_price || 0);
        }, 0);
        return total;
    }
    updateStatus(item: any, status: string): void {
        const confirmation = this._fuseConfirmationService.open({
            title: "ยืนยันการเปลี่ยนสถานะข้อมูล",
            message: "คุณต้องการยืนยันการเปลี่ยนสถานะข้อมูลใช่หรือไม่ ",
            icon: {
                show: false,
                name: "heroicons_outline:exclamation",
                color: "warning"
            },
            actions: {
                confirm: {
                    show: true,
                    label: "ยืนยัน",
                    color: "sky"
                },
                cancel: {
                    show: true,
                    label: "ยกเลิก"
                }
            },
            dismissible: true
        });

        // Subscribe to the confirmation dialog closed action
        confirmation.afterClosed().subscribe((result) => {
            if (result === 'confirmed') {
                const data ={
                    status: status
                }
                this._Service.updatstatus(data, item.id).subscribe({
                    next: () => {
                        this.rerender()
                    },
                    error: (err) => { console.error('Update failed', err); },
                });
            };
        }, (error) => {
            console.error('Error', error);
        });
    }
}

