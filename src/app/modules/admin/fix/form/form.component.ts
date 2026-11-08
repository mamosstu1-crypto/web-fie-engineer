import { values } from 'lodash';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    LOCALE_ID,
    OnDestroy,
    OnInit,
} from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { AuthService } from 'app/core/auth/auth.service';
import { Service } from '../page.service';
import { debounceTime, ReplaySubject, Subject, takeUntil } from 'rxjs';
import { DateTime } from 'luxon';
import { CustomerDialogComponent } from '../customer-dialog/customer-dialog.component';
import { VehicleDialogComponent } from '../vehicle/vehicle-dialog.component';
import moment from 'moment';
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
import { DatePipe } from '@angular/common';

@Component({
    selector: 'form-stock',
    templateUrl: './form.component.html',
    styleUrls: ['./form.component.scss'],
    changeDetection: ChangeDetectionStrategy.Default,
    providers: [
        { provide: DateAdapter, useClass: CustomDateAdapter },
        { provide: MAT_DATE_FORMATS, useValue: DATE_TH_FORMATS },
        { provide: LOCALE_ID, useValue: 'th-TH-u-ca-gregory' },
        { provide: MAT_DATE_LOCALE, useValue: 'th-TH' },
    ],
})
export class ListfromComponent implements OnInit, AfterViewInit, OnDestroy {
    formFieldHelpers: string[] = ['fuse-mat-dense'];
    form: FormGroup;
    files: File[] = [];
    Id: any;
    itemData: any;

    //item
    itemProduct: any;
    itemFilter = new FormControl('');
    filterItem: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
    options: any[] = [];
    unit: any[] = [];
    unit_convertion: any[] = [];
    location: any[] = [];
    vendor: any[] = [];
    vatType: any[] = [
        {
            value: 'vat',
            name: 'VAT'
        },
        {
            value: 'nonvat',
            name: 'Non VAT'
        }
    ]
    //customer
    customerFilter = new FormControl('');
    filterCustomer: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
    vehicleFilter = new FormControl('');
    filterVehicle: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

    customer: any;
    branch: any;
    // service: any;
    vehicle: any;
    province: any;
    filteredInsuranceTypes: any;
    listVehicleInspection: any;
    brands: any;
    user: any;
    type: any;
    payment: any[] = [
        { value: 'paid_cash', name: 'เงินสด' },
        { value: 'paid_tran', name: 'เงินโอน' },
        { value: 'credit', name: 'เครดิต' },
    ]
    /**
     * Constructor
     */
    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseConfirmationService: FuseConfirmationService,
        private _fb: FormBuilder,
        private _Service: Service,
        private _matDialog: MatDialog,
        private _router: Router,
        private _activatedRoute: ActivatedRoute,
        private _authService: AuthService,
        private _dialog: MatDialog
    ) {
        this.user = JSON.parse(localStorage.getItem('user'));

        this.Id = this._activatedRoute.snapshot.paramMap.get('id');
        this.itemProduct = this._activatedRoute.snapshot.data.service;
        this.filterItem.next(this.itemProduct.slice());

        this.customer = this._activatedRoute.snapshot.data.customer.data;
        this.filterCustomer.next(this.customer.slice());
        this.type = this._activatedRoute.snapshot.data.status;
        this.branch = this._activatedRoute.snapshot.data.branch;
        this.vehicle = this._activatedRoute.snapshot.data.vehicle;
        this.filterVehicle.next(this.vehicle.slice());
        this.province = this._activatedRoute.snapshot.data.province;
        this.filteredInsuranceTypes =
            this._activatedRoute.snapshot.data.filteredInsuranceTypes;
        this.listVehicleInspection =
            this._activatedRoute.snapshot.data.listVehicleInspection;
        this.brands = this._activatedRoute.snapshot.data.brands;

        this.form = this._fb.group({
            id: null,
            branches_id: null,
            paid_type: [null],

            remark: null,
            total: 0,
            discount: 0,
            tax: 0,
            total_amount: 0,
            type: 'nonvat',

            date: new Date(),
            payment_term: null, //
            status_paid: null,
            service: this._fb.array([]),

            status: null,

            customer_id: null,
            customer_type: null,
            customer_no: null,
            customer_name: null,
            customer_lname: null,
            customer_address: null,
            customer_phone: null,
            customer_email: null,
            customer_tax_id: null,
            customer_is_headquarter: null,

            vehicle_id: null,
            brand_name: null,
            model_name: null,
            license_plate: null,
            mileage: null,
            chassis_number: null,
            engine_number: null,
            valid_until: null,
        });
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    ngOnInit() {
        const currentDate = DateTime.now();
        const validUntil = currentDate
            .plus({ days: 15 })
            .toFormat('yyyy-MM-dd');

        if (this.Id) {
            this._Service.getById(this.Id).subscribe((resp: any) => {
                this.itemData = resp.data;
                this.form.patchValue({
                    ...this.itemData,
                });
                this.customerFilter.setValue(
                    this.itemData?.customer_name ?? ''
                );
                this.vehicleFilter.setValue(
                    this.itemData?.vehicles?.license_plate ?? ''
                );
                this.itemData.work_order_services.forEach((element) => {
                    const selected = this.itemProduct.find(
                        (item) => item.id === element.service_id
                    );
                    let item = this._fb.group({
                        id: element.id,
                        service_id: element.service_id,
                        service_name: selected.name,
                        unit_price: element.unit_price,
                        qty: element.qty,
                        discount: element.discount,
                        service_price: element.service_price,
                    });

                    item.get('qty').valueChanges.subscribe((value) => {
                        this.calculateTotal(item);
                    });

                    this.service().push(item);
                    this.subscribeValueChanges(item);
                });
            });
        } else {
            this.form.patchValue({
                branches_id: this.user?.employees?.branch_id,
                payment_term: 'cash',
                date: DateTime.now().toFormat('yyyy-MM-dd'),
                valid_until: validUntil,
                total: 0,
                discount: 0,
                tax: 0,
                total_amount: 0,
            });
        }

        this.itemFilter.valueChanges
            .pipe(takeUntil(this._onDestroy))
            .subscribe(() => {
                this._filterItem();
            });
        this.customerFilter.valueChanges
            .pipe(takeUntil(this._onDestroy))
            .subscribe(() => {
                this._filterCustomer();
            });
        this.vehicleFilter.valueChanges
            .pipe(takeUntil(this._onDestroy))
            .subscribe(() => {
                this._filterVehicle();
            });

        // this.calculateTotalForAllItems();

        this.service().valueChanges.subscribe((services: any[]) => {
            const total = services.reduce(
                (total, service) => total + service.service_price,
                0
            );

            this.form.patchValue(
                {
                    total: total,
                },
                { emitEvent: false }
            );
        });

        this._changeDetectorRef.markForCheck();
    }

    protected _filterItem() {
        if (!this.itemProduct) {
            return;
        }
        let search = this.itemFilter.value;
        if (!search) {
            this.filterItem.next(this.itemProduct.slice());
            return;
        } else {
            search = search.toLowerCase();
        }
        this.filterItem.next(
            this.itemProduct.filter(
                (item) => item.name.toLowerCase().indexOf(search) > -1
            )
        );
    }

    protected _filterCustomer() {
        if (!this.customer) {
            return;
        }
        let search = this.customerFilter.value;
        if (!search) {
            this.filterCustomer.next(this.customer.slice());
            return;
        } else {
            search = search.toLowerCase();
        }
        this.filterCustomer.next(
            this.customer.filter(
                (item) => item.name.toLowerCase().indexOf(search) > -1
            )
        );
    }
    protected _filterVehicle() {
        if (!this.vehicle) {
            return;
        }
        let search = this.vehicleFilter.value;
        if (!search) {
            this.filterVehicle.next(this.vehicle.slice());
            return;
        } else {
            search = search.toLowerCase();
        }
        this.filterVehicle.next(
            this.vehicle.filter(
                (item) => item.license_plate.toLowerCase().indexOf(search) > -1
            )
        );
    }

    checkStatus(data: string) {
        let status: string = data;
        let statusText: string = '';
        if (status === 'quotation') {
            statusText = 'ใบเสนอราคา';
        } else if (status === 'taxinvoice') {
            statusText = 'ใบกำกับภาษี';
        } else if (status === 'billing') {
            statusText = 'ใบวางบิล';
        } else if (status === 'invoice') {
            statusText = 'ใบแจ้งหนี้';
        } else {
            statusText = 'ไม่ทราบสถานะ';
        }
        return statusText;
    }

    /**
     * After view init
     */
    ngAfterViewInit(): void {}

    /**

     * On destroy
     */ protected _onDestroy = new Subject<void>();
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._onDestroy.next();
        this._onDestroy.complete();
    }

    Submit(): void {
        if (this.Id) {
            const confirmation = this._fuseConfirmationService.open({
                title: 'แก้ไขข้อมูล',
                message: 'คุณต้องการแก้ไขข้อมูลใช่หรือไม่ ',
                icon: {
                    show: false,
                    name: 'heroicons_outline:exclamation',
                    color: 'warning',
                },
                actions: {
                    confirm: {
                        show: true,
                        label: 'ยืนยัน',
                        color: 'sky',
                    },
                    cancel: {
                        show: true,
                        label: 'ยกเลิก',
                    },
                },
                dismissible: true,
            });

            // Subscribe to the confirmation dialog closed action
            confirmation.afterClosed().subscribe((result) => {
                if (result === 'confirmed') {


                       const datePipe = new DatePipe("en-US");
                                        const date = datePipe.transform(
                                          this.form.value.date,
                                          "yyyy-MM-dd"
                                        );
                                        const valid_until = datePipe.transform(
                                            this.form.value.valid_until,
                                          "yyyy-MM-dd"
                                        );
                                        this.form.patchValue({
                                            date: date,
                                            valid_until: valid_until,
                                        })
                                        let formValue = this.form.value


                    this._Service.update(this.Id, formValue).subscribe({
                        next: (resp: any) => {
                            this._router.navigate(['fix/list']);
                        },
                        error: (err: any) => {
                            this.form.enable();
                            this._fuseConfirmationService.open({
                                title: 'กรุณาระบุข้อมูล',
                                message: err.error.message,
                                icon: {
                                    show: true,
                                    name: 'heroicons_outline:exclamation',
                                    color: 'warning',
                                },
                                actions: {
                                    confirm: {
                                        show: false,
                                        label: 'ยืนยัน',
                                        color: 'primary',
                                    },
                                    cancel: {
                                        show: false,
                                        label: 'ยกเลิก',
                                    },
                                },
                                dismissible: true,
                            });
                        },
                    });
                }
            });
        } else {
            const confirmation = this._fuseConfirmationService.open({
                title: 'เพิ่มข้อมูล',
                message: 'คุณต้องการเพิ่มข้อมูลใช่หรือไม่ ',
                icon: {
                    show: false,
                    name: 'heroicons_outline:exclamation',
                    color: 'warning',
                },
                actions: {
                    confirm: {
                        show: true,
                        label: 'ยืนยัน',
                        color: 'sky',
                    },
                    cancel: {
                        show: true,
                        label: 'ยกเลิก',
                    },
                },
                dismissible: true,
            });

            // Subscribe to the confirmation dialog closed action
            confirmation.afterClosed().subscribe((result) => {
                if (result === 'confirmed') {
                    const datePipe = new DatePipe("en-US");
                    const date = datePipe.transform(
                      this.form.value.date,
                      "yyyy-MM-dd"
                    );

                    this.form.patchValue({
                        date: date,
                    })
                    let formValue = this.form.value
                    this._Service.create(formValue).subscribe({
                        next: (resp: any) => {
                            this._router.navigate(['fix/list']);
                        },
                        error: (err: any) => {
                            this.form.enable();
                            this._fuseConfirmationService.open({
                                title: 'กรุณาระบุข้อมูล',
                                message: err.error.message,
                                icon: {
                                    show: true,
                                    name: 'heroicons_outline:exclamation',
                                    color: 'warning',
                                },
                                actions: {
                                    confirm: {
                                        show: false,
                                        label: 'ยืนยัน',
                                        color: 'primary',
                                    },
                                    cancel: {
                                        show: false,
                                        label: 'ยกเลิก',
                                    },
                                },
                                dismissible: true,
                            });
                        },
                    });
                }
            });
        }
    }

    backTo() {
        this._router.navigate(['fix/list']);
    }

    onOptionProduct(event: any) {
        const selectedName = event.option.value;
        const selected = this.itemProduct.find(
            (item) => item.name === selectedName
        );

        if (selected) {
            const existingItem = this.service().controls.find(
                (control) => control.get('service_id')?.value === selected.id
            );
            if (existingItem) {
                const currentQty = existingItem.get('qty')?.value || 0;
                const newQty = currentQty + 1; // เพิ่มจำนวน 1
                existingItem.patchValue({
                    qty: newQty,
                    service_price: newQty * +selected.price, // คำนวณ total ใหม่
                });
                this.sumPrice();
            } else {
                if (selected) {
                    let item = this._fb.group({
                        service_id: selected.id,
                        service_name: selected.name,
                        unit_price: selected.price,
                        service_price: selected.price * 1,
                        qty: 1,
                        discount: 0,
                    });

                    this.service().push(item);
                    this.subscribeValueChanges(item);
                }
                this.sumPrice();
            }
            // this.calculateTotal()

            this.itemFilter.setValue(null); // ล้างค่าในช่อง input
        }
    }
    onOptionCustomer(event: any) {
        const selectedName = event.option.value;
        const selected = this.customer.find(
            (item) => item.name === selectedName
        );

        if (selected) {
            this.form.patchValue({
                customer_id: selected.id,
            });
            this.customerFilter.setValue(selected.name); // ล้างค่าในช่อง input
        }
    }
    onOptionVehicle(event: any) {
        const selectedName = event.option.value;
        const selected = this.vehicle.find(
            (item) => item.license_plate === selectedName
        );

        if (selected) {
            this.form.patchValue({
                vehicle_id: selected.id,
            });
            this.vehicleFilter.setValue(selected.license_plate);
        }
    }

    private _filter(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.options.filter((option) =>
            option.toLowerCase().includes(filterValue)
        );
    }

    service(): FormArray {
        return this.form.get('service') as FormArray;
    }

    newService(): FormGroup {
        return this._fb.group({
            service_id: null,
            service_price: 0,
            qty: 0,
            discount: 0,
            calculated_price: 0,
        });
    }

    addService(): void {
        this.service().push(this.newService());
    }

    removeService(i: number): void {
        this.service().removeAt(i);
        this.sumPrice();
    }
    // calculateTotal1() {
    //     let total = 0;
    //     let discount = 0;
    //     this.form.value.service.forEach(service => { total += service.service_price * service.qty; discount += service.discount; });
    //     const totalAfterDiscount = total - discount;
    //     const tax = parseFloat((totalAfterDiscount * 0.07).toFixed(2)); // คำนวณ VAT 7% และแปลงเป็นทศนิยม 2 ตำแหน่ง
    //     const totalAmount = parseFloat((totalAfterDiscount + tax).toFixed(2)); // คำนวณยอดรวมสุทธิและแปลงเป็นทศนิยม 2 ตำแหน่ง
    //     this.form.patchValue(
    //         {
    //             total: total,
    //             discount: discount,
    //             tax: tax,
    //             total_amount: totalAmount
    //         }
    //     );
    // }

    calculateTotal(item: FormGroup) {
        const qty = item.get('qty')?.value || 0;
        const price = item.get('unit_price')?.value || 0;
        const discount = item.get('discount')?.value || 0;

        // ตรวจสอบไม่ให้ discount ติดลบ
        const validDiscount = Math.max(0, discount);
        const total = qty * price - validDiscount;

        item.patchValue(
            {
                service_price: total,
            },
            { emitEvent: false }
        ); // เพื่อป้องกันการเกิด loop ที่ไม่จำเป็น
        this.sumPrice()
    }

    subscribeValueChanges(item: FormGroup) {
        // ใช้ debounceTime เพื่อรอหลังจากผู้ใช้พิมพ์เสร็จ
        item.get('discount')
            ?.valueChanges.pipe(debounceTime(300)) // รอ 300 มิลลิวินาทีหลังจากการพิมพ์เสร็จ
            .subscribe(() => {
                this.calculateTotal(item);
                this.sumPrice(); // เรียกฟังก์ชัน sumPrice หลังคำนวณ total
            });

        item.get('qty')
            ?.valueChanges.pipe(debounceTime(300)) // ใช้ debounceTime เช่นเดียวกัน
            .subscribe(() => {
                this.calculateTotal(item);
                this.sumPrice(); // เรียกฟังก์ชัน sumPrice หลังคำนวณ total
            });
        item.get('unit_price')
            ?.valueChanges.pipe(debounceTime(300)) // ใช้ debounceTime เช่นเดียวกัน
            .subscribe(() => {
                this.calculateTotal(item);
                this.sumPrice(); // เรียกฟังก์ชัน sumPrice หลังคำนวณ total
            });

        this.form
            .get('discount')
            ?.valueChanges.pipe(debounceTime(300)) // รอ 300 มิลลิวินาทีหลังจากการพิมพ์เสร็จ
            .subscribe(() => {
                // this.calculateTotal(item);
                this.changeDiscount(); // เรียกฟังก์ชัน sumPrice หลังคำนวณ total
            });
    }

    calculateTotalForAllItems() {
        this.service().controls.forEach((item: FormGroup) => {
            this.calculateTotal(item);
            this.subscribeValueChanges(item);
        });
    }

    // sumPrice() {
    //     let price1 = 0;
    //     let price2 = 0;
    //     let price3 = 0;
    //     let discount = 0;
    //     this.form.value.service.forEach((element) => {
    //         price1 = element.service_price;
    //         price2 = price2 + element.service_price;
    //         discount += element.discount;
    //     });
    //     price3 = price2 - discount;
    //     const tax = parseFloat((price3 * 0.07).toFixed(2)); // คำนวณ VAT 7% และแปลงเป็นทศนิยม 2 ตำแหน่ง
    //     const totalAmount = parseFloat((price3 + tax).toFixed(2)); // คำนวณยอดรวมสุทธิและแปลงเป็นทศนิยม 2 ตำแหน่ง

    //     this.form.patchValue({
    //         discount: discount,
    //         total: price2,
    //         tax: tax,
    //         total_amount: totalAmount,
    //     });
    // }
    sumPrice() {
        let price1 = 0; // ราคาของบริการแต่ละรายการ
        let price2 = 0; // ราคารวมของบริการทั้งหมด
        let discount = this.form.get('discount')?.value ?? 0; // ส่วนลดรวมทั้งหมด

        // คำนวณราคาบริการและส่วนลดรวม
        this.form.value.service.forEach((element) => {
            price1 = element.service_price;
            price2 += element.service_price;
            // discount += element.discount;
        });

        // ราคาสุทธิหลังหักส่วนลด
        const price3 = price2 - discount;

        // ตรวจสอบประเภทการคิดภาษี
        let tax = 0;
        if (this.form.value.type === 'nonvat') {
          tax = 0;
        } else {
          tax = parseFloat((price3 * 0.07).toFixed(2));
        }

        // ยอดรวมสุทธิ
        const totalAmount = parseFloat((price3 + tax).toFixed(2));

        // อัปเดตค่าลงในฟอร์ม
        this.form.patchValue({
            discount: discount,
            total: price2,
            tax: tax,
            total_amount: totalAmount,
        },{ emitEvent: false });
    }

    changeDiscount() {
        let formValue = this.form.value;
        let price3 = formValue.total - formValue.discount;
        const tax = parseFloat((price3 * 0.07).toFixed(2)); // คำนวณ VAT 7% และแปลงเป็นทศนิยม 2 ตำแหน่ง
        const totalAmount = parseFloat((price3 + tax).toFixed(2)); // คำนวณยอดรวมสุทธิและแปลงเป็นทศนิยม 2 ตำแหน่ง
        this.form.patchValue({
            tax: tax,
            total_amount: totalAmount,
        });
    }
    private formatDate(dateString: string): string {
        // ตรวจสอบว่า string อยู่ในรูปแบบ YYYY-MM-DD ด้วย moment
        if (moment(dateString, 'YYYY-MM-DD', true).isValid()) {
            // ถ้าอยู่ในรูปแบบ YYYY-MM-DD ให้ส่งคืนค่าเดิม
            return dateString;
        }
        // แปลงวันที่เป็นรูปแบบ YYYY-MM-DD
        const formattedDate = moment(dateString).format('YYYY-MM-DD');
        return formattedDate;
    }

    customerDialog(value: any) {
        const dialogRef = this._dialog.open(CustomerDialogComponent, {
            width: '900px',
            height: '90vh',
            data: {
                type: value,
                province: this.province,
            },
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result && value === 'NEW') {
                const fullAddress = `${result.address?.address} ${result.address?.provinces?.name_th} ${result.address?.districts?.name_th} ${result.address?.sub_districts?.name_th} ${result.address?.sub_districts?.zip_code}`;
                this.form.patchValue({
                    customer_type: result.customer?.type,
                    customer_id: result.customer?.id,
                    customer_no: result.customer?.no,
                    customer_name: result.customer?.name,
                    customer_lname: result.customer?.lname,
                    customer_address: fullAddress,
                    customer_phone: result.customer?.phone_number1,
                    customer_email: result.customer?.email,
                    customer_tax_id: result.customer?.tax_id,
                    customer_is_headquarter: result.customer?.is_headquarter,
                });
            } else if (result && value === 'LIST') {
                this.form.patchValue({
                    customer_type: result.customer?.type,
                    customer_id: result.customer?.id,
                    customer_no: result.customer?.no,
                    customer_name: result.customer?.name,
                    customer_lname: result.customer?.lname,
                    customer_address: result.address,
                    customer_phone: result.customer?.phone_number1,
                    customer_email: result.customer?.email,
                    customer_tax_id: result.customer?.tax_id,
                    customer_is_headquarter: result.customer?.is_headquarter,
                });
            }
        });
    }
    vehicleDialog(value: any) {
        if (
            this.form.value.customer_id === null ||
            this.form.value.customer_id === '' ||
            this.form.value.customer_id === undefined
        ) {
            this._fuseConfirmationService.open({
                title: 'กรุณาระบุข้อมูล',
                message: 'กรุณาเลือกลูกค้าหรือเพิ่มลูกค้าก่อนเลือกรถ',
                icon: {
                    show: true,
                    name: 'heroicons_outline:exclamation',
                    color: 'warning',
                },
                actions: {
                    confirm: {
                        show: false,
                        label: 'ยืนยัน',
                        color: 'primary',
                    },
                    cancel: {
                        show: false,
                        label: 'ยกเลิก',
                    },
                },
                dismissible: true,
            });

            return;
        }
        const dialogRef = this._dialog.open(VehicleDialogComponent, {
            width: '900px',
            height: '90vh',
            data: {
                type: value,
                province: this.province,
                filteredInsuranceTypes: this.filteredInsuranceTypes,
                listVehicleInspection: this.listVehicleInspection,
                brands: this.brands,
                customer_id: this.form.value.customer_id,
            },
        });
        dialogRef.afterClosed().subscribe((result) => {
            if (result && value === 'NEW') {
                // const fullAddress = `${result.address.address} ${result.provinces.name_th} ${result.districts.name_th} ${result.sub_districts.name_th} ${result.sub_districts.zip_code}`;
                this.form.patchValue({
                    vehicle_id: result?.id,
                    brand_name: result.vehicle_brands?.name,
                    model_name: result.vehicle_models?.name,
                    license_plate: result.license_plate,
                    mileage: result.mileage,
                    chassis_number: result.chassis_number,
                    engine_number: result.engine_number,
                });
            } else if (result && value === 'LIST') {
                this.form.patchValue({
                    vehicle_id: result?.id,
                    brand_name: result.vehicle_brands?.name,
                    model_name: result.vehicle_models?.name,
                    license_plate: result.license_plate,
                    mileage: result.mileage,
                    chassis_number: result.chassis_number,
                    engine_number: result.engine_number,
                });
            }
        });
    }
    onChangeVat() {
        if (this.form.value.type === 'nonvat') {
            this.form.patchValue({
                tax: 0
            },{ emitEvent: false })
            this.sumPrice()
        } else {
            this.sumPrice()
        }
    }
}
