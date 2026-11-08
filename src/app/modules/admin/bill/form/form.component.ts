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
import { StockService } from '../page.service';
import { debounceTime, ReplaySubject, Subject, takeUntil } from 'rxjs';
import { DateTime } from 'luxon';
import { MatDateFormats, MAT_DATE_FORMATS, DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import * as _moment from 'moment';
import { DatePipe } from '@angular/common';
const moment = _moment;

// 👉 "วัน/เดือน/ปี"
export const MY_FORMATS: MatDateFormats = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
    selector: 'form-stock',
    templateUrl: './form.component.html',
    styleUrls: ['./form.component.scss'],
    changeDetection: ChangeDetectionStrategy.Default,
    providers: [
        { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
        { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
    ],
})

export class FormComponent implements OnInit, AfterViewInit, OnDestroy {
    formFieldHelpers: string[] = ['fuse-mat-dense'];
    form: FormGroup;
    files: File[] = [];
    Id: any
    itemData: any

    ///item
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
    payment_type: any[] = [
        {
            value: 'paid_cash',
            name: 'เงินสด'
        },
        {
            value: 'credit',
            name: 'เครดิต'
        },
        {
            value: 'paid_tran',
            name: 'โอนเงิน'
        }
    ]
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
    ///customer
    customer: any;
    customerFilter = new FormControl('');
    filterCustomer: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

    branch: any;
    user: any
    type: any

    taxinvoice_no:string;
    /**
     * Constructor
     */
    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseConfirmationService: FuseConfirmationService,
        private _fb: FormBuilder,
        private _Service: StockService,
        private _router: Router,
        private _activatedRoute: ActivatedRoute
    ) {
        this.user = JSON.parse(localStorage.getItem('user'))

        this.Id = this._activatedRoute.snapshot.paramMap.get('id');
        this.itemProduct = this._activatedRoute.snapshot.data.service
        this.filterItem.next(this.itemProduct.slice());

        this.customer = this._activatedRoute.snapshot.data.customer.data
        this.filterCustomer.next(this.customer.slice());
        this.type = this._activatedRoute.snapshot.data.status

        this.branch = this._activatedRoute.snapshot.data.branch

        this.form = this._fb.group({
            id: null,
            branche_id: null,
            customer_id: [null],
            name: null,
            payment_term: null,
            paid_type: [null],
            date: null,
            valid_until: null,
            total: 0,
            remark: null,
            discount: 0,
            tax: 0,
            total_amount: 0,
            type: 'vat',
            service: this._fb.array([])
        })
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    ngOnInit() {
        const currentDate = DateTime.now();
        const validUntil = currentDate.plus({ days: 15 }).toFormat('yyyy-MM-dd');
        const paidTypeControl = this.form.get('paid_type');

        if (this.type === 'taxinvoice') {
            paidTypeControl.setValidators(Validators.required);
            paidTypeControl.updateValueAndValidity();

        } else {
            paidTypeControl.clearValidators();
            paidTypeControl.updateValueAndValidity();

        }

        if (this.Id && this.type === 'quotation') {
            this._Service.getById(this.Id, this.type).subscribe((resp: any) => {
                this.itemData = resp.data
                this.form.patchValue({
                    ...this.itemData,
                })
                this.customerFilter.setValue(this.itemData?.customers?.name ?? '')
                this.itemData.quotation_services.forEach(element => {
                    const selected = this.itemProduct.find(item => item.id === element.service_id);
                    let item = this._fb.group({

                        id: element.id,
                        service_id: element.service_id,
                        service_name: selected.name,
                        unit_price: element.unit_price,
                        qty: element.qty,
                        discount: element.discount,
                        service_price: element.service_price,
                    })

                    item.get('qty').valueChanges.subscribe((value) => {
                        this.calculateTotal(item)
                    })

                    this.service().push(item);
                    this.subscribeValueChanges(item);
                });
            })
        } else if (this.Id && this.type === 'taxinvoice') {
            this._Service.getById(this.Id, this.type).subscribe((resp: any) => {
                this.itemData = resp.data

                this.taxinvoice_no = this.itemData?.tax_invoice_all_nos[0]?.no;
                this.form.patchValue({
                    ...this.itemData,
                    paid_type: this.itemData?.paid_type ,
                })
                this.customerFilter.setValue(this.itemData?.customers?.name ?? '')
                this.itemData.tax_invoice_service.forEach(element => {
                    let item = this._fb.group({
                        id: element.id,
                        service_id: element.service_id,
                        service_name: element.service_name,
                        unit_price: element.unit_price,
                        qty: element.qty,
                        discount: element.discount,
                        service_price: element.service_price,
                    })

                    item.get('qty').valueChanges.subscribe((value) => {
                        this.calculateTotal(item)
                    })

                    this.service().push(item)
                    this.subscribeValueChanges(item);
                });
            })
        }
        else {
            this.form.patchValue({
                branche_id: this.user?.employees?.branch_id,
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

        // this.calculateTotalForAllItems();
        this.service().valueChanges
        .subscribe((services: any[]) => {
            const total = services.reduce((total, service) => total + service.service_price, 0);

            this.form.patchValue({
                total: total,
            }, { emitEvent: false })
        })
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
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        if (this.type === 'taxinvoice') {
            if (this.form.value.payment_term === 'cash') {
                this.form.patchValue({ payment_term: 'paid_cash' });
            } else if (this.form.value.payment_term === 'tran') {
                this.form.patchValue({ payment_term: 'paid_tran' });
            } else if (this.form.value.payment_term === 'credit') {
                this.form.patchValue({ payment_term: 'credit' });
            }
        }

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
                        color: "primary"
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

                    this._Service.update(this.Id, formValue, this.type).subscribe({
                        next: () => {
                            if (this.type === 'quotation') {
                                this._router.navigate(['document/list/quotation']);
                            } else if (this.type === 'taxinvoice') {
                                this._router.navigate(['document/list/taxinvoice']);
                            }
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
                        color: "primary"
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

                    this._Service.create(formValue, this.type).subscribe({
                        next: () => {
                            if (this.type === 'quotation') {
                                this._router.navigate(['document/list/quotation']);
                            } else if (this.type === 'taxinvoice') {
                                this._router.navigate(['document/list/taxinvoice']);
                            }
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
        if(this.type === 'taxinvoice') {
            this._router.navigate(['document/list/taxinvoice'])
        }else if(this.type === 'quotation') {
            this._router.navigate(['document/list/quotation'])
        }else if(this.type === 'billing') {
            this._router.navigate(['document/list/billing'])
        }else if(this.type === 'invoice') {
            this._router.navigate(['document/list/invoice'])
        }else {
            this._router.navigate(['document/list/quotation'])
        }
    }

    onOptionProduct(event: any) {
        const selectedName = event.option.value;
        const selected = this.itemProduct.find(item => item.name === selectedName);

        if (selected) {
            let priceToUse = selected.price;

            // Check if the service is linked to a document and we have a customer selected
            if (selected.doc_id && this.form.value.customer_id) {

                // Find if there's custom pricing for this document and customer
                const customPricing = this.doc_price.find(price => price.docs_id === selected.doc_id && price.customer_id === this.form.value.customer_id
                );

                // If custom pricing exists, use it instead of the default price
                if (customPricing) {
                    priceToUse = parseFloat(customPricing.price);
                }
            }


            const existingItem = this.service().controls.find((control) => control.get('service_id')?.value === selected.id);
            if (existingItem) {
                const currentQty = existingItem.get('qty')?.value || 0;
                const newQty = currentQty + 1; // เพิ่มจำนวน 1
                existingItem.patchValue({
                    qty: newQty,
                    unit_price: priceToUse,
                    service_price: newQty * priceToUse // คำนวณ total ใหม่
                });
                this.sumPrice()
            } else {
                if (selected) {
                    let item = this._fb.group({
                        service_id: selected.id,
                        service_name: selected.name,
                        unit_price: priceToUse,
                        service_price: priceToUse * 1,
                        qty: 1,
                        discount: 0,
                    });

                    this.service().push(item);
                    this.subscribeValueChanges(item);
                }
                this.sumPrice()
            }
            // this.calculateTotal()

            this.itemFilter.setValue(null); // ล้างค่าในช่อง input
        }
    }

    doc_price: any[] = []
    onOptionCustomer(event: any) {
        const selectedName = event.option.value;
        const selected = this.customer.find(item => item.name === selectedName);

        if(selected.type =='agent') {
            this._Service.getDocBycustomer(selected.id).subscribe((resp: any) => {
                this.doc_price = resp.data
            });
        }

        if (selected) {
            this.form.patchValue({
                name: selected.name,
                customer_id: selected.id
            })
            this.customerFilter.setValue(selected.name); // ล้างค่าในช่อง input
        }
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
            calculated_price: 0
        });
    }

    addService(): void {
        this.service().push(this.newService());

    }


    removeService(i: number): void {
        this.service().removeAt(i);
        this.sumPrice();
    }

    calculateTotal(item: FormGroup) {
        const qty = item.get('qty')?.value || 0;
        const price = item.get('unit_price')?.value || 0;
        const discount = item.get('discount')?.value || 0;

        // ตรวจสอบไม่ให้ discount ติดลบ
        const validDiscount = Math.max(0, discount);
        const total = (qty * price) - validDiscount;

        item.patchValue({
            service_price: total
        }, { emitEvent: false }); // เพื่อป้องกันการเกิด loop ที่ไม่จำเป็น
        this.sumPrice()
    }

    subscribeValueChanges(item: FormGroup) {
        // ใช้ debounceTime เพื่อรอหลังจากผู้ใช้พิมพ์เสร็จ
        item.get('discount')?.valueChanges
            .pipe(debounceTime(300)) // รอ 300 มิลลิวินาทีหลังจากการพิมพ์เสร็จ
            .subscribe(() => {
                this.calculateTotal(item);
                this.sumPrice(); // เรียกฟังก์ชัน sumPrice หลังคำนวณ total
            });

        item.get('qty')?.valueChanges
            .pipe(debounceTime(300)) // ใช้ debounceTime เช่นเดียวกัน
            .subscribe(() => {
                this.calculateTotal(item);
                this.sumPrice(); // เรียกฟังก์ชัน sumPrice หลังคำนวณ total
            });
        item.get('unit_price')?.valueChanges
            .pipe(debounceTime(300))
            .subscribe(() => {
                this.calculateTotal(item);
                this.sumPrice();
            });

        item.get('service_price')?.valueChanges
            .pipe(debounceTime(500))
            .subscribe(() => {
                this.sumPrice();
            });

        this.form.get('discount')?.valueChanges
            .pipe(debounceTime(300))
            .subscribe(() => {
                // this.calculateTotal(item);
                this.changeDiscount();
            });

    }

    calculateTotalForAllItems() {
        this.service().controls.forEach((item: FormGroup) => {
            this.calculateTotal(item);
            this.subscribeValueChanges(item);
        });
    }

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
        const tax = this.form.value.type === 'nonvat' ? 0 : parseFloat((price3 * 0.07).toFixed(2));

        // ยอดรวมสุทธิ
        const totalAmount = parseFloat((price3 + tax).toFixed(2));

        // อัปเดตค่าลงในฟอร์ม
        this.form.patchValue({
            discount: discount,
            total: price2,
            tax: tax,
            total_amount: totalAmount,
        });
    }


    changeDiscount() {
        let formValue = this.form.value
        let price3 = formValue.total - formValue.discount;
        const tax = this.form.value.type === 'nonvat' ? 0 : parseFloat((price3 * 0.07).toFixed(2));
        const totalAmount = parseFloat((price3 + tax).toFixed(2)); // คำนวณยอดรวมสุทธิและแปลงเป็นทศนิยม 2 ตำแหน่ง
        this.form.patchValue({
            tax: tax,
            total_amount: totalAmount,
        });

    }
    private formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0]; //YYYY-MM-DD
    }

    onChangeVat() {
        if (this.form.value.type === 'nonvat') {
            this.form.patchValue({
                tax: 0
            })
            this.sumPrice()
        } else {
            this.sumPrice()
        }
    }
}
