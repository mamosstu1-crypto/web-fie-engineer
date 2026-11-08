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
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom, Observable, Subject } from 'rxjs';
import { fuseAnimations } from '@fuse/animations';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Service } from '../page.service';
import { DataTableDirective } from 'angular-datatables';
import { ADTSettings } from 'angular-datatables/src/models/settings';
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
import { FormDataFrame } from './list.mainframe';
import { FormDataService } from 'app/modules/matdynamic/form-data.service';
import { environment } from 'environments/environment';
import { HttpClient } from '@angular/common/http';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { EditDialogComponent } from '../dialog-customer/dialog.component';

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
    selectedDate: any; // สำหรับวันที่เดียว
    dateRange: { start: Date | null; end: Date | null } = {
        start: null,
        end: null,
    };

    // Properties and ViewChilds
    public dtOptions: DataTables.Settings = {};
    public dtOptions2: DataTables.Settings = {};
    dtTrigger: Subject<ADTSettings> = new Subject<ADTSettings>();
    public dataRow1: any[] = [];
    public dataRow2: any[] = [];
    public formData: FormGroup;
    public formData_PaidData: FormGroup;
    public createResp: any[] = [];
    public updateResp: any[] = [];
    public deleteResp: any[] = [];
    public flashMessage: 'success' | 'error' | null = null;
    public isLoading: boolean = false;
    public currentStart: number = 0;
    public pages = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    public isEdit: boolean = false;
    public dialogWidth: number = 40; // scale in %
    public billId: number;
    public billStatus: string;
    public selectedStatus: string = '';
    private tableSearchValue: string = '';
    public user: any;

    @ViewChildren(DataTableDirective) dtElements: QueryList<DataTableDirective>;
    @ViewChild(MatPaginator) _paginator: MatPaginator;
    @ViewChild('paidType') paidType: TemplateRef<any>;
    @ViewChild('TransecInform') TransecInform: TemplateRef<any>;

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private start: number;
    dialog: any;
    public reduceScreen: boolean = false;
    selectedTabIndex: number = 0;
    changeTab(index: number): void {
        this.selectedTabIndex = index;
    }
    onTabChange(index: number): void {
        this.dialogRef.updateSize(
            index === 2 ? '90%' : this.reduceScreen ? '90%' : '90%'
        );
    }

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseConfirm: FuseConfirmationService,
        private _formBuilder: FormBuilder,
        private _Service: Service,
        private _matDialog: MatDialog,
        private _activatedRoute: ActivatedRoute,
        private _formDataFrame: FormDataFrame,
        private _formDataService: FormDataService,
        private _US: UtilityService,
        private _router: Router,
        private _http: HttpClient
    ) {
        this.formData = this._formDataFrame.createMainForm();
        this._formDataService.setFormGroup('formData', this.formData);

        this.formData_PaidData = this._formDataFrame.createPaidDataForm();
        this._formDataService.setFormGroup(
            'formData_PaidData',
            this.formData_PaidData
        );

        this.formData.get('total').disable();
        this.user = JSON.parse(localStorage.getItem('user'));

        // this.formData.get('paid_price').disable();
        // this.formData.get('remaining_amount').disable();
    }
    // Lifecycle Hooks
    async ngOnInit(): Promise<void> {
        this._activatedRoute.queryParams.subscribe(
            (params) => (this.start = params['start'])
        );
        this.loadTable();
        // this.loadTable2();

        // PaidType
        {
            // this.formData.get('discount').valueChanges.subscribe(() => {
            //     const discount = Number(this.formData.get('discount').value) || 0;
            //     const total = Number(this.formData.get(this.paidState()).value) || 0;
            //     if (discount > total) { this.formData.patchValue({ discount: total }) }

            //     const lastprice = total - discount;
            //     const rounded = parseFloat(lastprice.toFixed(2));
            //     this.formData.patchValue({ last_price: rounded });
            // });
            this.formData.get('now_paid').valueChanges.subscribe(() => {
                const nowPaid =
                    Number(this.formData.get('now_paid').value) || 0;
                const overdue_nonvat =
                    Number(this.formData.get('overdue_nonvat').value) || 0;
                if (nowPaid > overdue_nonvat) {
                    const changeprice = nowPaid - overdue_nonvat;
                    const rounded = parseFloat(changeprice.toFixed(2));
                    this.formData.patchValue({ change_price: rounded });
                } else {
                    this.formData.patchValue({ change_price: 0.0 });
                }
            });
            this.formData.get('now_paid_vat').valueChanges.subscribe(() => {
                const nowPaid =
                    Number(this.formData.get('now_paid_vat').value) || 0;
                const overdue_vat =
                    Number(this.formData.get('overdue_vat').value) || 0;
                if (nowPaid > overdue_vat) {
                    const changeprice = nowPaid - overdue_vat;
                    const rounded = parseFloat(changeprice.toFixed(2));
                    this.formData.patchValue({ change_price_vat: rounded });
                } else {
                    this.formData.patchValue({ change_price_vat: 0.0 });
                }
            });
        }
    }
    ngAfterViewInit(): void {
        setTimeout(() => {
            this.dtTrigger.next(this.dtOptions as ADTSettings);
            this.resetTableScroll();
        }, 200);
    }

    private resetTableScroll(): void {
        const el = document.querySelector('.bill-scroll') as HTMLElement | null;
        if (el) {
            el.scrollLeft = 0;
        }
    }
    ngOnDestroy(): void {
        this.dtTrigger.unsubscribe();
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // DataTable Initialization
    loadTable(): void {
        this.dtOptions = {
            pagingType: 'full_numbers',
            pageLength: 10,
            displayStart: this.start,
            serverSide: true,
            processing: true,
            responsive: false,
            order: [],
            ordering: false,
            orderCellsTop: true,
            language: {
                url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/th.json',
            },
            ajax: (dataTablesParameters: any, callback) => {
                this.currentStart = dataTablesParameters.start;

                const order =
                    dataTablesParameters.order.length > 0
                        ? dataTablesParameters.order[0]
                        : { column: 1, dir: 'desc' };
                dataTablesParameters.status = this.selectedStatus;
                this.tableSearchValue = dataTablesParameters.search?.value ?? '';
                const startDate =
                    this.formData.get('startDate')?.value ||
                    this._US.pdfDefaultDate('firstDayOfMonth');
                const endDate =
                    this.formData.get('endDate')?.value ||
                    this._US.pdfDefaultDate('lastDayOfMonth');
                const formatSDate = this._US.pdfDateFormat(startDate);
                const formatEDate = this._US.pdfDateFormat(endDate);
                dataTablesParameters.date_start = formatSDate;
                dataTablesParameters.date_end = formatEDate;
                dataTablesParameters.branch_id = this.user.employees.branch_id;
                this._Service
                    .getPage({ ...dataTablesParameters, order: [order] })
                    .subscribe((resp) => {
                        this.dataRow1 = resp.data;
                        this.pages.current_page = resp.current_page;
                        this.pages.last_page = resp.last_page;
                        this.pages.per_page = resp.per_page;

                        resp.current_page > 1
                            ? (this.pages.begin =
                                resp.per_page * (resp.current_page - 1))
                            : (this.pages.begin = 0);

                        callback({
                            recordsTotal: resp.total,
                            recordsFiltered: resp.total,
                            data: [],
                        });
                        this._changeDetectorRef.markForCheck();
                        setTimeout(() => this.resetTableScroll(), 0);
                    });
            },
        };
    }

    onStatusChange(status: string): void {
        this.selectedStatus = status;
        this.rerender();
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
    delete(id: any): void {
        this._US.deleteItem(
            id,
            this._Service,
            this._fuseConfirm,
            this.rerender.bind(this),
            this.deleteResp
        );
    }

    get serviceTransactionsArray(): FormArray {
        return this.formData.get('service_transactions') as FormArray;
    }

    // Dialog Operations
    dialogRef: any;
    transecInformRef: any;
    docImageRef: any;

    alldata: any;
    openpaidType(item: any): void {
        this.billId = item.id;
        this.billStatus = item.status;
        if (item.total_nonvatcal == 0 && item.total_vatcal == 0) {
            this.changeTab(0);
        } else {
            this.changeTab(1);
        }

        this.loaddata();

        if (this.billId) {
            this.callInspectId(this.billId);
        }
        this.dialogRef = this._matDialog.open(this.paidType, {
            width: this.reduceScreen ? '90%' : '60%',
        });
    }
    /* affect under dialog */
    public paidTypeButtonOpen: boolean = true;
    // updatePaidStatus(paidStatus: string) {
    //     // paidStatus == 'finish'
    //     //     ? (this.formData.get('now_paid').disable(),
    //     //       (this.paidTypeButtonOpen = false),
    //     //       this.setNowToLast())
    //     //     : (this.formData.get('now_paid').enable(),
    //     //       (this.paidTypeButtonOpen = true));

    //     const discountData = {
    //         // status: paidStatus,
    //         // total: this.formData.get('total').value,

    //         discount: this.formData.get('discount').value,
    //         discount_after_vat: this.formData.get('discount_after_vat').value,
    //         discount_before_vat: this.formData.get('discount_before_vat').value,
    //         status: paidStatus,
    //         total: this.formData.get('total').value,
    //         total_nonvat: this.formData.get('total_nonvat').value,
    //         total_nonvatcal: this.formData.get('total_nonvatcal').value,
    //         total_vat: this.formData.get('total_vat').value,
    //         total_vatcal: this.formData.get('total_vatcal').value,
    //     };

    //     this._Service.pushDiscount(discountData, this.billId).subscribe({
    //         next: () => {
    //             this._Service.getData(this.billId).subscribe((resp: any) => {
    //                 const installments = resp.data.installments;
    //                 const nonVat = installments.find(
    //                     (loop: any) => loop.type === 'nonvat'
    //                 );
    //                 const vat = installments.find((loop: any) => loop.type === 'vat');

    //                 this.formData.patchValue({
    //                     status: resp.data.status,
    //                     id: resp.data.id,
    //                     vehicle_id: resp.data.vehicle_id,
    //                     total_vatcal: resp.data.total_vatcal ?? 0,
    //                     total_nonvatcal: resp.data.total_nonvatcal ?? 0,
    //                     overdue_nonvat: nonVat?.after_price ?? 0,
    //                     overdue_vat: vat?.after_price ?? 0,
    //                     now_paid: nonVat?.after_price ?? 0,
    //                     now_paid_vat: vat?.after_price ?? 0,
    //                 });
    //                 this.formData
    //                     .get('last_price')
    //                     .patchValue(this.formData.get(this.paidState()).value);
    //             });
    //             this.changeTab(1);
    //         },
    //         error: (err) => {
    //             console.error('Update failed', err);
    //         },
    //     });

    // }
    loaddata() {
        this._Service.getData(this.billId).subscribe((resp: any) => {
            const installments = resp.data.Installments;
            this.alldata = resp.data;
            const nonVat = installments.find(
                (loop: any) => loop.type === 'nonvat'
            );
            const vat = installments.find((loop: any) => loop.type === 'vat');

            this.formData.patchValue({
                status: resp.data.status,
                id: resp.data.id,
                vehicle_id: resp.data.vehicle_id,
                total: resp.data.total ?? 0,
                total_vatcal: resp.data.total_vatcal ?? 0,
                total_nonvatcal: resp.data.total_nonvatcal ?? 0,
                total_vat: resp.data.total_vat ?? 0,
                total_nonvat: resp.data.total_nonvat ?? 0,
                overdue_nonvat: nonVat?.after_price ?? 0,
                overdue_vat: vat?.after_price ?? 0,
                now_paid: nonVat?.after_price ?? 0,
                now_paid_vat: vat?.after_price ?? 0,
            });
            this.formData
                .get('last_price')
                .patchValue(this.formData.get(this.paidState()).value);
        });
    }

    updatePaidStatus(paidStatus: string) {
        let total_vat = this.formData.get('total_vat').value;
        let total_nonvat = this.formData.get('total_nonvat').value;
        const discountBeforeVatControl = this.formData.get(
            'discount_before_vat'
        );
        const discountAfterVatControl = this.formData.get('discount_after_vat');
        const discountControl = this.formData.get('discount');

        const discountBeforeVat = discountBeforeVatControl.value || 0;
        const discountAfterVat = discountAfterVatControl.value || 0;
        const discount = discountControl.value || 0;

        total_vat = (total_vat - discountBeforeVat) * 1.07 - discountAfterVat;
        total_nonvat -= discount;

        let total = this.formData.get('total').value;
        const discountData = {
            status: paidStatus,
            discount: this.formData.get('discount').value,
            discount_before_vat: this.formData.get('discount_before_vat').value,
            discount_after_vat: this.formData.get('discount_after_vat').value,
            total: this.formData.get('total').value,
            total_vat: this.formData.get('total_vat').value,
            total_nonvat: this.formData.get('total_nonvat').value,
            total_vatcal: total_vat,
            total_nonvatcal: total_nonvat,
        };
        let last_price = total_vat + total_nonvat;
        this._Service.pushDiscount(discountData, this.billId).subscribe({
            next: () => {
                this.formData.get('total_vatcal').patchValue(total_vat);
                this.formData.get('total_nonvatcal').patchValue(total_nonvat);
                this.formData.get('last_price').patchValue(last_price);
                this.formData.get('now_paid').patchValue(total_nonvat);
                this.formData.get('now_paid_vat').patchValue(total_vat);

            },
            error: (err) => {
                console.error('Update failed', err);
            },
        });
        this.loaddata();
        // paidStatus == 'finish'
        //     ? (this.formData.get('now_paid').disable(),
        //       (this.paidTypeButtonOpen = false))
        //     : (this.formData.get('now_paid').enable(),
        //       (this.paidTypeButtonOpen = true));
        // paidStatus == 'finish'
        //     ? (this.formData.get('now_paid_vat').disable(),
        //       (this.paidTypeButtonOpen = false))
        //     : (this.formData.get('now_paid_vat').enable(),
        //       (this.paidTypeButtonOpen = true));
        this.changeTab(1);
    }

    updatePaidResult(paidResult: string) {
        const data = {
            inspection_id: this.billId,
            date: this.formData.get('installment_date').value,
            paid_type: paidResult,
            description: this.formData.get('description').value,
            paid_price: this.formData.get('now_paid').value,
            type: 'nonvat',
        };
        const data2 = {
            inspection_id: this.billId,
            date: this.formData.get('installment_date').value,
            paid_type: paidResult,
            description: this.formData.get('description').value,
            paid_price: this.formData.get('now_paid_vat').value,
            type: 'vat',
        };
        this.addInstallment(data, data2, this.billId).then(() => {
            this._Service.getData(this.billId).subscribe((resp: any) => {
                const installments = resp.data.installments;
                const nonVat = installments.find(
                    (loop: any) => loop.type === 'nonvat'
                );
                const vat = installments.find((loop: any) => loop.type === 'vat');

                this.formData.patchValue({
                    status: resp.data.status,
                    id: resp.data.id,
                    vehicle_id: resp.data.vehicle_id,
                    total_vatcal: resp.data.total_vatcal ?? 0,
                    total_nonvatcal: resp.data.total_nonvatcal ?? 0,
                    overdue_nonvat: nonVat?.after_price ?? 0,
                    overdue_vat: vat?.after_price ?? 0,
                    now_paid: nonVat?.after_price ?? 0,
                    now_paid_vat: vat?.after_price ?? 0,
                });
                this.formData
                    .get('last_price')
                    .patchValue(this.formData.get(this.paidState()).value);
            });
        });
        this._changeDetectorRef.markForCheck();
    }

    // paidState(): string { return this.billComplete ? 'remaining_amount' : 'total' }
    paidState(): string {
        switch (this.billStatus) {
            case 'open':
                return 'total';
            case 'overdue':
            case 'unpaid':
                return 'remaining_amount';
            default:
                return 'total';
        }
    }
    billState(): boolean {
        return !(this.billStatus == 'finish' || this.billStatus == 'cancel');
    }

    openpaidData(paid_type: string) {
        this.formData_PaidData.patchValue({
            paid_type: paid_type,
            status: this.formData.get('status').value,
            discount: this.formData.get('discount').value,
            total: this.formData.get('total').value,
        });

        const discountData = this.formData_PaidData.value;
        this._Service.pushDiscount(discountData, this.billId).subscribe({
            next: () => { },
            error: (err) => {
                console.error('Update failed', err);
            },
        });
        this.changeTab(1);
    }

    async callInspectId(id: number): Promise<void> {
        this._Service.getInspectionsID(id).subscribe({
            next: (resp: any) => {
                this.dataRow2 = resp.data;
            },
            error: (err: any) => {
                this.handleApiError(err);
            },
        });
    }

    pushChange() {
        const data = {
            inspection_id: this.billId,
            description: this.formData.get('description').value,
            paid_price: this.formData.get('now_paid').value,
        };
        this.addInstallment(data, this.billId);
        this.changeTab(1);
    }
    async addInstallment(
        data: any,
        data2: any,
        specificId?: number
    ): Promise<void> {
        const hasNonVat = this.alldata.inspection_vehicles[0].vehicle_service_transaction.some(
            (control) => control.is_vat === 0
        );
        const hasVat = this.alldata.inspection_vehicles[0].vehicle_service_transaction.some(
            (control) => control.is_vat === 1
        );

        if (hasNonVat && !hasVat) {
            this._Service.installment_add(data).subscribe({
                next: () => {
                    if (specificId) {
                        this.callInspectId(specificId);
                        this.rerender();
                    }
                    this.changeTab(2);
                },
                error: (err) => {
                    console.error('add failed', err);
                    this.showFlashMessage('error');
                },
            });
        } else if (!hasNonVat && hasVat) {
            this._Service.installment_add(data2).subscribe({
                next: () => {
                    if (specificId) {
                        this.callInspectId(specificId);
                        this.rerender();
                    }
                    this.changeTab(2);
                },
                error: (err) => {
                    console.error('add failed', err);
                    this.showFlashMessage('error');
                },
            });
        } else if (hasNonVat && hasVat) {
            this._Service.installment_add(data).subscribe({
                next: () => {
                    if (specificId) {
                        this.callInspectId(specificId);
                        this.rerender();
                    }
                    this.changeTab(2);
                },
                error: (err) => {
                    console.error('add failed', err);
                    this.showFlashMessage('error');
                },
            });

            this._Service.installment_add(data2).subscribe({
                next: () => {
                    if (specificId) {
                        this.callInspectId(specificId);
                        this.rerender();
                    }
                },
                error: (err) => {
                    console.error('add failed', err);
                    this.showFlashMessage('error');
                },
            });
        }
    }

    setNowToLast() {
        const lastPrice = Number(this.formData.get('last_price').value || 0);
        this.formData.patchValue({
            now_paid: parseFloat(lastPrice.toFixed(2)),
        });
    }

    openTransection(item?: any): void {
        if (item) {
            this.formData_PaidData.patchValue({ ...item });
        }
        this.transecInformRef = this._matDialog.open(this.TransecInform, {
            width: this.reduceScreen ? '90%' : '60%',
        });
    }

    updateTransec(): void {
        const data = this.formData_PaidData.value;
        this._Service.updateTransec(data, data.id).subscribe({
            next: () => {
                this.callInspectId(this.billId);
            },
            error: (err) => {
                this.handleApiError(err);
            },
        });
        this.closeDialog(this.transecInformRef);
    }
    deleteTransec(id: string): void {
        this._Service.deleteTransec(id).subscribe({
            next: () => {
                this.callInspectId(this.billId);
            },
            error: (err) => {
                this.handleApiError(err);
            },
        });
    }

    handleApiError(error: any): void {
        this._US.confirmAction(
            'ข้อผิดพลาด',
            error.error.message,
            this._fuseConfirm,
            () => { },
            { showConfirm: false, showCancel: false }
        );
    }
    closeDialog(Ref?: any): void {
        Ref ? this._US.closeDialog(Ref) : this._matDialog.closeAll();
    }

    noNaN(event: KeyboardEvent): void {
        const allowedKeys = [
            'Backspace',
            'Tab',
            'ArrowLeft',
            'ArrowRight',
            'Delete',
            '.',
        ]; // คีย์ที่อนุญาต
        const isNumber = /^[0-9]$/;

        if (!allowedKeys.includes(event.key) && !isNumber.test(event.key)) {
            event.preventDefault(); // บล็อกการใส่คีย์ที่ไม่อนุญาต
        }
    }

    // Utility Methods
    rerender(): void {
        this.dtElements.forEach((dtElement: DataTableDirective) => {
            dtElement.dtInstance.then((dtInstance: any) =>
                dtInstance.ajax.reload()
            );
        });
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

    toggleDiscount(event: MatSlideToggleChange): void {
        const formTotal = Number(this.formData.get('total').value);
        const formDiscount = Number(this.formData.get('discount').value);
        const integerPart = Math.trunc(formTotal);
        const decimalPart = formTotal - integerPart;

        if (event.checked) {
            this.formData.patchValue({ discount: formDiscount + decimalPart });
        } else {
            this.formData.patchValue({
                discount:
                    formDiscount - decimalPart >= 0
                        ? formDiscount - decimalPart
                        : 0,
            });
        }
    }

    loadservice() {
        this._Service.getServices().subscribe((resp) => {
            const services = resp;
            const serviceFormArray = this.formData.get(
                'List_service_tran'
            ) as FormArray;
            this._changeDetectorRef.detectChanges();
        });
    }

    update(item: any): void {
        const id = item.id;
        const billStatus = item.status;
        this._router.navigate(['/bill_create/list'], {
            queryParams: { id: id, billStatus: billStatus },
        });
    }

    get servicesFormArray(): FormArray {
        return this.formData.get('List_service_tran') as FormArray;
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

    formatCustomerDisplay(item: any): string {
        const customer = item?.customers;
        if (!customer) {
            return '-';
        }
        const parts = [customer.name, customer.lname]
            .map((v) => (v ?? '').toString().trim())
            .filter(Boolean);
        let full = parts.join(' ').trim();
        if (!full) {
            return '-';
        }
        if (full.startsWith('undefined ')) {
            full = full.slice('undefined '.length).trim();
        }
        return full || '-';
    }

    private exportBranchId(): string {
        return String(
            this.user?.employees?.branch_id ?? this.user?.Employees?.branch_id ?? ''
        );
    }

    private dailyExportDateParams(): { start: string; end: string } {
        const startDate =
            this.formData.get('startDate')?.value ||
            this._US.pdfDefaultDate('firstDayOfMonth');
        const endDate =
            this.formData.get('endDate')?.value ||
            this._US.pdfDefaultDate('lastDayOfMonth');
        return {
            start: this._US.pdfDateFormat(startDate),
            end: this._US.pdfDateFormat(endDate),
        };
    }

    pdfDay(): void {
        const { start, end } = this.dailyExportDateParams();
        window.open(
            `${environment.API_URL}/api/report/reportExportPDFday?start_date=${start}&end_date=${end}&branch_id=${this.exportBranchId()}`,
            '_blank'
        );
    }

    pdfMonth(): void {
        const startDate =
            this.formData.get('startDate')?.value ||
            this._US.pdfDefaultDate('firstDayOfMonth');
        const endDate =
            this.formData.get('endDate')?.value ||
            this._US.pdfDefaultDate('lastDayOfMonth');
        const formatSDate = this._US.pdfDateFormat(startDate);
        const formatEDate = this._US.pdfDateFormat(endDate);
        window.open(
            `${environment.API_URL}/api/report/reportExportPDFmonth?start_date=${formatSDate}&end_date=${formatEDate}&branch_id=${this.exportBranchId()}`,
            '_blank'
        );
    }

    excelDay(): void {
        const { start, end } = this.dailyExportDateParams();
        window.open(
            `${environment.API_URL}/api/report/excel/day?start_date=${start}&end_date=${end}&branch_id=${this.exportBranchId()}`,
            '_blank'
        );
    }

    excelMonth(): void {
        const startDate =
            this.formData.get('startDate')?.value ||
            this._US.pdfDefaultDate('firstDayOfMonth');
        const endDate =
            this.formData.get('endDate')?.value ||
            this._US.pdfDefaultDate('lastDayOfMonth');
        const formatSDate = this._US.pdfDateFormat(startDate);
        const formatEDate = this._US.pdfDateFormat(endDate);
        window.open(
            `${environment.API_URL}/api/report/excel/month?start_date=${formatSDate}&end_date=${formatEDate}&branch_id=${this.exportBranchId()}`,
            '_blank'
        );
    }

    // onDateChange(event: any): void {
    //     const start = event.value?.start ?? this.formData.get('startDate')?.value;
    //     const end = event.value?.end ?? this.formData.get('endDate')?.value;

    //     this.formData.patchValue({
    //         startDate: start,
    //         endDate: end
    //     });
    // }

    /* Date format (moment to json) */
    onDateChange(event: any, controlName: string, formName: FormGroup): void {
        this._US.onDateChange(event, controlName, formName);
        this.rerender();
    }
    onDateInput(event: any): void {
        this._US.onDateInput(event);
    }

    printPDF1(id: any) {
        this._US.openPDF(`${environment.API_URL}/api/license/${id}`);
    }
    printPDF2(id: any) {
        this._US.openPDF(`${environment.API_URL}/api/license_image/${id}`);
    }
    printPDF3(id: any) {
        this._US.openPDF(
            `${environment.API_URL}/api/report/ListPDFcheck_testLPG/${id}`
        );
    }
    printPDF4(id: any) {
        this._US.openPDF(
            `${environment.API_URL}/api/report/exportPDF/certificate/${id}`
        );
    }
    printPDF5(id: any) {
        this._US.openPDF(`${environment.API_URL}/api/report/report_cng/${id}`);
    }
    printbillservice(id: any) {
        this._US.openPDF(
            `${environment.API_URL}/api/report/exportPDF/billservice/${id}`
        );
    }
    printreceipt(id: number, id2: number) {
        this._US.openPDF(
            `${environment.API_URL}/api/report/exportPDF/receipt/${id}?installments_id=${id2}`
        );
    }
    printBillquotation(id: any) {
        this._US.openPDF(
            `${environment.API_URL}/api/report/exportPDF/billquotation/${id}`
        );
    }
    // billtax_invioce(id: any) {
    //     this._US.openPDF(
    //         `${environment.API_URL}/api/report/exportPDF/billtax_invioce/${id}`
    //     );
    // }
    billtax_invioce(id: any) {
        this._US.confirmAction(
            'สร้างเลขที่ใบกำกับภาษี',
            'คุณต้องการสร้างเลขที่ใบกำกับภาษีใช่หรือไม่',
            this._fuseConfirm,
            () => {
                window.open(
                    `${environment.API_URL}/api/report/exportPDF/billtax_invioce/${id}`
                );
            }
        );
    } //ใบกำกับภาษี
    printquotation(id: any) {
        window.open(
            `${environment.API_URL}/api/report/exportPDF/Quotation/${id}`
        );
    }
    printallreceipt(id: any) {
        window.open(
            `${environment.API_URL}/api/report/exportPDF/allreceipt/${id}`
        );
    }

    getServicePrice(service: any[], service_id: number): string {
        if (!service || service.length === 0) {
            return '0';
        }
        const matchedService = service.find(
            (item) => item.service_id === service_id
        );
        return matchedService?.service_price
            ? matchedService.service_price
            : '0';
    }

    getGasTotal(service: any[]): string {
        const ids = [8, 9, 10, 11, 12];
        const total = ids.reduce((sum, id) => {
            const transaction = service.find((t) => t.service_id === id);
            return sum + (transaction?.service_price || 0);
        }, 0);
        return total;
    }
    getotherTotal(service: any[]): string {
        const ids = [13, 15, 16];
        const total = ids.reduce((sum, id) => {
            const transaction = service.find((t) => t.service_id === id);
            return sum + (transaction?.service_price || 0);
        }, 0);
        return total;
    }

    getTexTotal(service: any[]): string {
        const ids = [3, 4, 5, 6];
        const total = ids.reduce((sum, id) => {
            const transaction = service.find((t) => t.service_id === id);
            return sum + (transaction?.service_price || 0);
        }, 0);
        return total;
    }
    updateStatus(item: any, status: string): void {
        const data = {
            status: status,
        };
        this._Service.updatstatus(data, item.id).subscribe({
            next: () => {
                this.rerender();
            },
            error: (err) => {
                console.error('Update failed', err);
            },
        });
    }

    openDialogEdit(data: any) {
        const dialogRef = this._matDialog.open(EditDialogComponent, {
            width: '80%',
            height: 'auto',
            maxHeight: '90vh',
            data: data
        });
        dialogRef.afterClosed().subscribe((result) => {
            this.rerender()
            this.closeDialog(result)
        });
    }
}
