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
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom, Observable, Subject } from 'rxjs';
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
import { AuthService } from 'app/core/auth/auth.service';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { values } from 'lodash';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { environment } from 'environments/environment';

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
    public dtOptions1: DataTables.Settings = {};
    public dtOptions2: DataTables.Settings = {};
    public dtOptions3: DataTables.Settings = {};
    public dtOptions4: DataTables.Settings = {};
    public dtOptions5: DataTables.Settings = {};
    private pages1 = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    private pages2 = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    private pages3 = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    private pages4 = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    private pages5 = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    public dataRow1: any[] = [];
    public dataRow2: any[] = [];
    public dataRow3: any[] = [];
    public dataRow4: any[] = [];
    public dataRow5: any[] = [];

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
    @ViewChild('editDialog') editDialog: TemplateRef<any>;
    public selectedItem: any;
    @ViewChild('taxRenewalDialog') taxRenewalDialog!: TemplateRef<any>;
    dialogRef: any;

    selectedItem2: any = null;
    taxRenewalDateModel: Date | null = null;
    paytrueDebtHint = '';

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
        private _US: UtilityService
    ) {
        this.formData = this._formBuilder.group({
            tax_vehicle: [''],
            ids: this._formBuilder.array([]),

            startDate: [''],
            endDate: [''],
        });
    }

    ngOnInit(): void {
        this._activatedRoute.queryParams
            // .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((params) => {
                this.start = params['start'];
            });
        this.loadTable('check', 1);
        this.loadTable('wait', 2);
        this.loadTable('send', 3);
        this.loadTable('complete', 4);
        this.loadTable('success', 5);

        this.formData.get('startDate')?.valueChanges.subscribe(() => {
            this.rerender();
        });
        this.formData.get('endDate')?.valueChanges.subscribe(() => {
            this.rerender();
        });
    }

    onTabChange(): void {
        const idsArray = this.formData.get('ids') as FormArray;
        idsArray.clear();
    }

    loadTable(status: string, tableIndex: number): void {
        const dtOptionsKey = `dtOptions${tableIndex}`; // ชื่อของตัวแปร dtOptions
        const pagesKey = `pages${tableIndex}`; // ชื่อของตัวแปร pages

        this[dtOptionsKey] = {
            pagingType: 'full_numbers',
            pageLength: 10,
            displayStart: this.start,
            order: [],
            serverSide: true,
            processing: true,
            responsive: true,
            language: {
                url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/th.json',
            },
            ajax: (dataTablesParameters: any, callback) => {
                const user = JSON.parse(localStorage.getItem('user'));
                const branch_id = user?.employees?.branch_id;
                dataTablesParameters.branch_id = branch_id;
                this.currentStart = dataTablesParameters.start;
                dataTablesParameters.tax_vehicle = status;
                dataTablesParameters.start_date =
                    this.formData.get('startDate')?.value;
                dataTablesParameters.end_date =
                    this.formData.get('endDate')?.value;

                const order =
                    dataTablesParameters.order.length > 0
                        ? dataTablesParameters.order[0]
                        : { column: 0, dir: 'desc' };
                this._Service
                    .getPage({ ...dataTablesParameters, order: [order] })
                    .subscribe((resp) => {

                        this[`dataRow${tableIndex}`] = resp.data;
                        this[pagesKey].current_page = resp.current_page;
                        this[pagesKey].last_page = resp.last_page;
                        this[pagesKey].per_page = resp.per_page;

                        resp.current_page > 1
                            ? (this[pagesKey].begin =
                                resp.per_page * (resp.current_page - 1))
                            : (this[pagesKey].begin = 0);

                        callback({
                            recordsTotal: resp.total,
                            recordsFiltered: resp.total,
                            data: [],
                        });
                        this._changeDetectorRef.markForCheck();
                    });
            },
            columns: [
                { data: 'id', orderable: false },
                { data: 'no' },
                { data: 'date' },
                { data: 'license_plate' },
                { data: 'result', orderable: false },
                { data: 'customer_name', orderable: false },
                { data: 'name_th', orderable: false },
                { data: 'type_document', orderable: false },
                { data: 'registration_date', orderable: false },
                { data: 'type', orderable: false },
                { data: 'id', orderable: false },
            ],
        };
    }

    ngAfterViewInit(): void { }
    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    /* Date format (moment to json) */
    onDateChange(event: any, controlName: string, formName: FormGroup): void {
        this._US.onDateChange(event, controlName, formName);
    }
    onDateInput(event: any): void {
        this._US.onDateInput(event);
    }

    openDetail(item: any): void { }
    showFlashMessage(type: 'success' | 'error'): void {
        // Show the message
        this.flashMessage = type;

        // Mark for check
        this._changeDetectorRef.markForCheck();

        // Hide it after 3 seconds
        setTimeout(() => {
            this.flashMessage = null;

            // Mark for check
            this._changeDetectorRef.markForCheck();
        }, 3000);
    }
    showEdit(): boolean {
        return this._US.hasPermission(1);
    }
    showDelete(): boolean {
        return this._US.hasPermission(1);
    }

    private getCurrentData(): any[] {
        switch (this.selectedTabIndex) {
            case 0:
                return this.dataRow1;
            case 1:
                return this.dataRow2;
            case 2:
                return this.dataRow3;
            case 3:
                return this.dataRow4;
            case 4:
                return this.dataRow5;
            default:
                return [];
        }
    }

    toggleSelectAll(isChecked: boolean): void {
        const idsArray = this.formData.get('ids') as FormArray;
        idsArray.clear();

        if (isChecked) {
            // เพิ่ม ID ทั้งหมดลงใน ids
            this.getCurrentData().forEach((item) => {
                idsArray.push(this._formBuilder.control(item.id));
            });
        }
    }
    toggleSelect(id: number, isChecked: boolean): void {
        const idsArray = this.formData.get('ids') as FormArray;

        if (isChecked) {
            // เพิ่ม ID ลงใน FormArray
            idsArray.push(this._formBuilder.control(id));
        } else {
            // นำ ID ออกจาก FormArray
            const index = idsArray.controls.findIndex(
                (control) => control.value === id
            );
            if (index >= 0) {
                idsArray.removeAt(index);
            }
        }
    }
    updateStatusID(status: string, id: string): void {
        const item = this.getCurrentData().find((item) => item.id === id);
        const formData = { tax_vehicle: status, actual_expenses: item.paytrue };
        this._Service.updateStatusID(formData, id).subscribe({
            next: () => {
                this.rerender();
            },
            error: (err) => {
                console.error('Update failed', err);
            },
        });
    }

    updateStatus(status: string): void {
        this.formData.get('tax_vehicle').patchValue(status);
        this._Service.updateStatus(this.formData.value).subscribe({
            next: () => {
                this.rerender();
            },
            error: (err) => {
                console.error('Update failed', err);
            },
        });
    }

    updateTypeDocument(type_document: string, id: string): void {
        const formData = { type_document };
        this._Service.updateTypeDocument(formData, id).subscribe({
            next: () => {
                this.rerender();
            },
            error: (err) => {
                console.error('Update failed', err);
            },
        });
    }

    isAllSelected(): boolean {
        const idsArray = this.formData.get('ids') as FormArray;
        return idsArray.length === this.getCurrentData().length;
    }
    isSomeSelected(): boolean {
        const idsArray = this.formData.get('ids') as FormArray;
        return (
            idsArray.length > 0 &&
            idsArray.length < this.getCurrentData().length
        );
    }
    clearSelection(): void {
        const idsArray = this.formData.get('ids') as FormArray;
        idsArray.clear();
    }

    rerender(): void {
        this.dtElements.forEach((dtElement: DataTableDirective) => {
            dtElement.dtInstance.then((dtInstance: any) =>
                dtInstance.ajax.reload()
            );
        });
    }

    pdf() {
        const user = JSON.parse(localStorage.getItem('user'));
        const branch_id = user?.employees?.branch_id;
        const startDate =
            this.formData.get('startDate')?.value ||
            this._US.pdfDefaultDate('firstDayOfMonth');
        const endDate =
            this.formData.get('endDate')?.value ||
            this._US.pdfDefaultDate('lastDayOfMonth');
        const formatSDate = this._US.pdfDateFormat(startDate);
        const formatEDate = this._US.pdfDateFormat(endDate);

        window.open(
            `${environment.API_URL}/api/report/reportExportPDFreport_car_tax?start_date=${formatSDate}&end_date=${formatEDate}&branch_id=${branch_id}`,
            '_blank'
        );
    }
    excel() {
        const user = JSON.parse(localStorage.getItem('user'));
        const branch_id = user?.employees?.branch_id;
        const startDate =
            this.formData.get('startDate')?.value ||
            this._US.pdfDefaultDate('firstDayOfMonth');
        const endDate =
            this.formData.get('endDate')?.value ||
            this._US.pdfDefaultDate('lastDayOfMonth');
        const formatSDate = this._US.pdfDateFormat(startDate);
        const formatEDate = this._US.pdfDateFormat(endDate);

        window.open(
            `${environment.API_URL}/api/report/excel/reportExportPDFreport_car_tax?start_date=${formatSDate}&end_date=${formatEDate}&branch_id=${branch_id}`,
            '_blank'
        );
    }
    excel_status() {
        const user = JSON.parse(localStorage.getItem('user'));
        const branch_id = user?.employees?.branch_id;
        const startDate =
            this.formData.get('startDate')?.value ||
            this._US.pdfDefaultDate('firstDayOfMonth');
        const endDate =
            this.formData.get('endDate')?.value ||
            this._US.pdfDefaultDate('lastDayOfMonth');
        const formatSDate = this._US.pdfDateFormat(startDate);
        const formatEDate = this._US.pdfDateFormat(endDate);
        let tax_vehicle = '';
        switch (this.selectedTabIndex) {
            case 0: tax_vehicle = 'check'; break;    // ตรวจสอบ
            case 1: tax_vehicle = 'wait'; break;    // รอนำส่ง
            case 2: tax_vehicle = 'send'; break;    // รายการนำส่ง
            case 3: tax_vehicle = 'complete'; break; // รอรับป้าย
            case 4: tax_vehicle = 'success'; break;  // สำเร็จ
            default: tax_vehicle = ''; break;
        }
        window.open(
            `${environment.API_URL}/api/report/excel/cartaxbystatus?start_date=${formatSDate}&end_date=${formatEDate}&tax_vehicle=${tax_vehicle}&branch_id=${branch_id}`,
            '_blank'
        );
    }

    openEditDialog(item: any): void {
        this.selectedItem = { ...item };
        this.updatePaytrueDebtHint();
        this._matDialog.open(this.editDialog, { width: `${this.dialogWidth}%`, data: { item } });
    }

    onPayTrueChange(): void {
        this.updatePaytrueDebtHint();
    }

    /** แสดงก่อนบันทึก — สอดคล้องคอลัมน์ payextra หน้ารายการหนี้ */
    private updatePaytrueDebtHint(): void {
        if (!this.selectedItem?.service_price && this.selectedItem?.service_price !== 0) {
            this.paytrueDebtHint = '';
            return;
        }
        const billed = parseFloat(String(this.selectedItem.service_price).replace(/,/g, ''));
        const payRaw = this.selectedItem.paytrue;
        if (payRaw === null || payRaw === undefined || payRaw === '') {
            this.paytrueDebtHint = '';
            return;
        }
        const pay = parseFloat(String(payRaw).replace(/,/g, ''));
        if (Number.isNaN(billed) || Number.isNaN(pay)) {
            this.paytrueDebtHint = '';
            return;
        }
        if (pay > billed) {
            this.paytrueDebtHint = `เพิ่ม ${(pay - billed).toLocaleString('th-TH')} บาท — อย่าลืมเก็บเพิ่มจากลูกค้า`;
            return;
        }
        if (pay < billed) {
            this.paytrueDebtHint = `คืน ${(billed - pay).toLocaleString('th-TH')} บาท — อย่าลืมคืนให้ลูกค้า`;
            return;
        }
        this.paytrueDebtHint = 'ยอดตรงกับรับมา — ไม่มีเพิ่ม/คืน';
    }

    // setPayTrueToReceived(): void {
    //     this.selectedItem.paytrue = this.selectedItem.total_service_tax;
    // }
    setPayTrueToReceived(): void {
        // ลบเครื่องหมายคอมม่าออกจากจำนวนเงินก่อนที่จะเซ็ตค่า
        const paytrueValue = parseFloat(this.selectedItem.service_price.toString().replace(/,/g, ''));
        this.selectedItem.paytrue = paytrueValue;
        this.updatePaytrueDebtHint();
    }


    // savePayTrue(): void {
    //     const index = this.dataRow4.findIndex(
    //         (item) => item.id === this.selectedItem.id
    //     );
    //     if (index !== -1) {
    //         // Remove any formatting from the paytrue value
    //         const paytrueValue = parseFloat(
    //             this.selectedItem.paytrue.toString().replace(/,/g, '')
    //         );
    //         this.dataRow4[index].paytrue = paytrueValue;
    //         const formData = { paytrue: paytrueValue };
    //         this._Service
    //             .updatePayTrue(formData, this.selectedItem.id)
    //             .subscribe({
    //                 next: () => {
    //                     this.rerender();
    //                     this._matDialog.closeAll();
    //                 },
    //                 error: (err) => {
    //                     console.error('Update failed', err);
    //                 },
    //             });
    //     }
    // }
    savePayTrue(): void {
        if (this.selectedItem) {

            const index = this.dataRow4.findIndex(item => item.id === this.selectedItem.id);
            if (index !== -1) {
                // เอาข้อมูลที่ถูกกรอกใน paytrue และสถานะ result มาอัปเดตใน dataRow4
                const paytrueValue = parseFloat(this.selectedItem.paytrue.toString().replace(/,/g, ''));
                this.dataRow4[index].paytrue = paytrueValue;
                this.dataRow4[index].result = this.selectedItem.result;
                this.dataRow4[index].commission = this.selectedItem.commission;

                // อัปเดตข้อมูลไปยังเซิร์ฟเวอร์
                const formData = {
                    paytrue: paytrueValue,
                    result: this.selectedItem.result,
                    commission: this.selectedItem.commission ? this.selectedItem.commission : 0
                };
                this._Service.updatePayTrue(formData, this.selectedItem.id).subscribe({
                    next: () => {
                        this._matDialog.closeAll();
                        this.rerender();
                    },
                    error: (err) => {
                        console.error('Update failed', err);
                    },
                });
            }
        }
    }
    closeDialog(Ref?: any, request?: string): void {
        Ref ? this._US.closeDialog(Ref) : this._matDialog.closeAll();
        this._changeDetectorRef.markForCheck();
    }
    setResult(status: string): void {
        this.selectedItem.result = status;
    }

    openTaxRenewalDialog(item: any) {
        this.selectedItem2 = item;

        // แปลงเป็น Date ให้ mat-datepicker ใช้งานได้
        this.taxRenewalDateModel = item.tax_renewal_date ? new Date(item.tax_renewal_date) : null;

        this.dialogRef = this._matDialog.open(this.taxRenewalDialog, {
            width: '520px',
            disableClose: true
        });
    }

    saveTaxRenewalDate() {
        if (!this.selectedItem2) return;

        const vehicleId = this.selectedItem2.vehicle_id; // ✅ ต้องมีใน row
        const date = this.taxRenewalDateModel
            ? this.formatDateForApi(this.taxRenewalDateModel)
            : null;

        this._Service.updateVehicleTaxRenewalDate(vehicleId, { tax_renewal_date: date })
            .subscribe({
                next: () => {
                    // อัปเดตในตารางทันที
                    this.selectedItem2.tax_renewal_date = date;
                    this.dialogRef.close();

                    // ถ้า DataTables ต้อง reload ให้เรียก reload table ด้วย
                    this.rerender();
                },
                error: (err) => {
                    console.error(err);
                }
            });
    }

    private formatDateForApi(d: Date) {
        // ส่ง YYYY-MM-DD
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
}
