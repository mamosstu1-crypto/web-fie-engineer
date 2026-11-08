import { values } from 'lodash';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit,
} from '@angular/core';
import {
    FormArray,
    FormBuilder,
    FormControl,
    FormGroup,
    Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { AuthService } from 'app/core/auth/auth.service';
import { Service } from '../page.service';
import { debounceTime, map, Observable, ReplaySubject, startWith, Subject, takeUntil } from 'rxjs';
import { DateTime } from 'luxon';
import { CustomerDialogComponent } from '../customer-dialog/customer-dialog.component';
import { VehicleDialogComponent } from '../vehicle/vehicle-dialog.component';
import moment from 'moment';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { DatePipe } from '@angular/common';
@Component({
    selector: 'form-stock',
    templateUrl: './form.component.html',
    styleUrls: ['./form.component.scss'],
    changeDetection: ChangeDetectionStrategy.Default,
})
export class ListfromComponent implements OnInit, AfterViewInit, OnDestroy {
    formFieldHelpers: string[] = ['fuse-mat-dense'];
    public filteredProvinces: Observable<string[]>;

    form: FormGroup;
    files: File[] = [];
    Id: any
    itemData: any

    //item
    itemProduct: any;
    itemFilter = new FormControl('');
    filterItem: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
    options: any[] = [];
    unit: any[] = [];
    unit_convertion: any[] = [];
    location: any[] = [];
    vendor: any[] = [];
    payment: any[] = [
        {
            value: 'cash',
            name: 'เงินสด'
        },
        {
            value: 'credit',
            name: 'เครดิต'
        },
        {
            value: 'tran',
            name: 'โอนเงิน'
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
    user: any
    engineers: any
    type: any
    type_gas: any[] = ['LPG', 'NGV']
    typeVehicle: any[] = ['รย.', 'ขส.']

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
        this.user = JSON.parse(localStorage.getItem('user'))

        this.Id = this._activatedRoute.snapshot.paramMap.get('id');
        this.itemProduct = this._activatedRoute.snapshot.data.service
        this.filterItem.next(this.itemProduct.slice());

        this.customer = this._activatedRoute.snapshot.data.customer.data
        this.filterCustomer.next(this.customer.slice());
        this.type = this._activatedRoute.snapshot.data.status
        this.branch = this._activatedRoute.snapshot.data.branch
        this.vehicle = this._activatedRoute.snapshot.data.vehicle
        this.filterVehicle.next(this.vehicle.slice());
        this.province = this._activatedRoute.snapshot.data.province
        this.filteredInsuranceTypes = this._activatedRoute.snapshot.data.filteredInsuranceTypes
        this.listVehicleInspection = this._activatedRoute.snapshot.data.listVehicleInspection
        this.brands = this._activatedRoute.snapshot.data.brands
        this.engineers = this._activatedRoute.snapshot.data.engineers.data

        this.form = this._fb.group({
            id: null,
            customer_id: null,
            vehicle_id: null,
            engineer_id: null,
            type_gas: ['', Validators.required],
            service_or: null,
            install_no: null,
            cha_no: [],
            date: null,
            time: null,
            photo: null,
            brand_gas: null,

            branches_id: null,
            remark: null,
            total: 0,
            payment_term: null,
            status_paid: null,
            status: null,
            customer_no: null,
            customer_name: null,
            customer_address: null,
            customer_phone: null,
            customer_email: null,
            customer_tax_id: null,
            customer_is_headquarter: null,
            brand_name: null,
            model_name: null,
            mileage: null,
            chassis_number: null,
            engine_number: null,
            total_weight_gas: null,
            valid_until: null,
            license_plate: ['', Validators.required],
            provinces: ['', Validators.required],
            typeVehicle: ['', Validators.required],
        })
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    ngOnInit() {
        const currentDate = DateTime.now();
        const validUntil = currentDate.plus({ days: 15 }).toFormat('yyyy-MM-dd');

        if (this.Id) {
            this._Service.getById(this.Id).subscribe((resp: any) => {
                this.itemData = resp.data
                this.numberArray = this.itemData.cha_no

                this.form.patchValue({
                    ...this.itemData,
                })
                this.customerFilter.setValue(this.itemData?.customer_name ?? '')
                this.vehicleFilter.setValue(this.itemData?.vehicles?.license_plate ?? '')
                this.itemData.work_order_services.forEach(element => {
                    const selected = this.itemProduct.find(item => item.id === element.service_id);

                    let item = this._fb.group({
                        id: element.id,
                        service_id: element.service_id,
                        service_name: selected.name,
                        unit_price: selected.price,
                        qty: element.qty,
                        discount: element.discount,
                        service_price: element.service_price,
                    })
                });
            })
        }
        else {
            this.form.patchValue({
                branches_id: this.user?.employees?.branch_id,
                payment_term: 'cash',
                date: DateTime.now().toFormat('yyyy-MM-dd'),
                valid_until: validUntil,
                total: 0,
                discount: 0,
                tax: 0,
                total_amount: 0,
            })
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
            this.itemProduct.filter(item =>
                item.name.toLowerCase().indexOf(search) > -1
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
            this.customer.filter(item =>
                item.name.toLowerCase().indexOf(search) > -1
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
            this.vehicle.filter(item =>
                item.license_plate.toLowerCase().indexOf(search) > -1
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
        return statusText
    }

    /**
     * After view init
     */
    ngAfterViewInit(): void { }

    /**

     * On destroy
     */  protected _onDestroy = new Subject<void>();
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._onDestroy.next();
        this._onDestroy.complete();
    }

    Submit(): void {
        if (this.Id) {
            const confirmation = this._fuseConfirmationService.open({
                title: "แก้ไขข้อมูล",
                message: "คุณต้องการแก้ไขข้อมูลใช่หรือไม่ ",
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
                    formValue.cha_no = this.numberArray
                    this._Service.update(this.Id, formValue).subscribe({
                        next: (resp: any) => {
                            this._router.navigate(['check-gas/list']);
                        },
                        error: (err: any) => {
                            this.form.enable();
                            this._fuseConfirmationService.open({
                                title: "กรุณาระบุข้อมูล",
                                message: err.error.message,
                                icon: {
                                    show: true,
                                    name: "heroicons_outline:exclamation",
                                    color: "warning"
                                },
                                actions: {
                                    confirm: {
                                        show: false,
                                        label: "ยืนยัน",
                                        color: "primary"
                                    },
                                    cancel: {
                                        show: false,
                                        label: "ยกเลิก"
                                    }
                                },
                                dismissible: true
                            });
                        }
                    });
                }
            });
        } else {
            const confirmation = this._fuseConfirmationService.open({
                title: "เพิ่มข้อมูล",
                message: "คุณต้องการเพิ่มข้อมูลใช่หรือไม่ ",
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
                    const datePipe = new DatePipe("en-US");
                    const date = datePipe.transform(
                      this.form.value.date,
                      "yyyy-MM-dd"
                    );

                    this.form.patchValue({
                        date: date,
                    })
                    let formValue = this.form.value
                    formValue.cha_no = this.numberArray
                    delete formValue.branches_id
                    delete formValue.remark
                    delete formValue.total
                    delete formValue.payment_term
                    delete formValue.status_paid
                    delete formValue.status
                    delete formValue.customer_no
                    delete formValue.customer_name
                    delete formValue.customer_address
                    delete formValue.customer_phone
                    delete formValue.customer_email
                    delete formValue.customer_tax_id
                    delete formValue.customer_is_headquarter
                    delete formValue.brand_name
                    delete formValue.model_name
                    delete formValue.license_plate
                    delete formValue.mileage
                    delete formValue.chassis_number
                    delete formValue.engine_number
                    this._Service.create(formValue).subscribe({
                        next: (resp: any) => {
                            this._router.navigate(['check-gas/list']);
                        },
                        error: (err: any) => {
                            this.form.enable();
                            this._fuseConfirmationService.open({
                                title: "กรุณาระบุข้อมูล",
                                message: err.error.message,
                                icon: {
                                    show: true,
                                    name: "heroicons_outline:exclamation",
                                    color: "warning"
                                },
                                actions: {
                                    confirm: {
                                        show: false,
                                        label: "ยืนยัน",
                                        color: "primary"
                                    },
                                    cancel: {
                                        show: false,
                                        label: "ยกเลิก"
                                    }
                                },
                                dismissible: true
                            });
                        }
                    });
                }
            });
        }
    }


    backTo() {
        this._router.navigate(['/check-gas/list'])
    }


    onOptionCustomer(event: any) {
        const selectedName = event.option.value;
        const selected = this.customer.find(item => item.name === selectedName);

        if (selected) {
            this.form.patchValue({
                customer_id: selected.id
            })
            this.customerFilter.setValue(selected.name); // ล้างค่าในช่อง input
        }
    }
    onOptionVehicle(event: any) {
        const selectedName = event.option.value;
        const selected = this.vehicle.find(item => item.license_plate === selectedName);

        if (selected) {
            this.form.patchValue({
                vehicle_id: selected.id
            })
            this.vehicleFilter.setValue(selected.license_plate);
        }
    }

    private _filter(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.options.filter((option) =>
            option.toLowerCase().includes(filterValue)
        );
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
                province: this.province
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result && value === 'NEW') {
                const fullAddress = `${result.address?.address} ${result.address?.provinces?.name_th} ${result.address?.districts?.name_th} ${result.address?.sub_districts?.name_th} ${result.address?.sub_districts?.zip_code}`;
                this.form.patchValue({
                    customer_id: result.customer?.id,
                    customer_no: result.customer?.no,
                    customer_name: result.customer?.name,
                    customer_address: fullAddress,
                    customer_phone: result.customer?.phone_number1,
                    customer_email: result.customer?.email,
                    customer_tax_id: result.customer?.tax_id,
                    customer_is_headquarter: result.customer?.is_headquarter,
                })
            } else if (result && value === 'LIST') {
                this.form.patchValue({
                    customer_id: result.customer?.id,
                    customer_no: result.customer?.no,
                    customer_name: result.customer?.name,
                    customer_address: result.address,
                    customer_phone: result.customer?.phone_number1,
                    customer_email: result.customer?.email,
                    customer_tax_id: result.customer?.tax_id,
                    customer_is_headquarter: result.customer?.is_headquarter,
                })
            }
        });
    }
    vehicleDialog(value: any) {
        // if (this.form.value.customer_id === null || this.form.value.customer_id === "" || this.form.value.customer_id === undefined) {
        //     this._fuseConfirmationService.open({
        //         title: 'กรุณาระบุข้อมูล',
        //         message: 'กรุณาเลือกลูกค้าหรือเพิ่มลูกค้าก่อนเลือกรถ',
        //         icon: {
        //             show: true,
        //             name: 'heroicons_outline:exclamation',
        //             color: 'warning',
        //         },
        //         actions: {
        //             confirm: {
        //                 show: false,
        //                 label: 'ยืนยัน',
        //                 color: 'primary',
        //             },
        //             cancel: {
        //                 show: false,
        //                 label: 'ยกเลิก',
        //             },
        //         },
        //         dismissible: true,
        //     });

        //     return;
        // }
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
            }
        });
        dialogRef.afterClosed().subscribe(result => {
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
                })
            } else if (result && value === 'LIST') {
                this.form.patchValue({
                    vehicle_id: result?.id,
                    brand_name: result.vehicle_brands?.name,
                    model_name: result.vehicle_models?.name,
                    license_plate: result.license_plate,
                    mileage: result.mileage,
                    chassis_number: result.chassis_number,
                    engine_number: result.engine_number,
                })
            }
        });
    }

    separatorKeysCodes: number[] = [ENTER, COMMA]; // กำหนดปุ่มที่ใช้แยกค่า (Enter, Comma)
    chipControl = new FormControl(); // FormControl สำหรับ input
    numberArray: number[] = []; // Array ที่ใช้เก็บค่าตัวเลข

    // เพิ่มค่าใน Array
    addChip(event: any): void {
        const value = (event.value || '').trim();
        if (value) {
            const number = parseInt(value, 10);
            if (!isNaN(number)) {
                this.numberArray.push(number); // เพิ่มตัวเลขลงใน Array
            } else {
                alert('กรุณากรอกตัวเลขที่ถูกต้อง');
            }
        }
        // ล้าง input หลังจากเพิ่มค่า
        event.chipInput!.clear();
        this.chipControl.setValue(null);
    }

    // ลบ chip ออกจาก Array
    removeChip(index: number): void {
        if (index >= 0) {
            this.numberArray.splice(index, 1);
        }
    }
}
