import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    LOCALE_ID,
    OnDestroy,
    OnInit,
} from '@angular/core';
import {
    FormArray,
    FormBuilder,
    FormControl,
    FormGroup,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { AuthService } from 'app/core/auth/auth.service';
import { StockService } from '../page.service';
import { debounceTime, ReplaySubject, Subject, takeUntil } from 'rxjs';
import { DateTime } from 'luxon';
import { UtilityService, DATE_TH_FORMATS, CustomDateAdapter } from 'app/app.utility-service';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'form-billing',
    templateUrl: './form.component.html',
    styleUrls: ['./form.component.scss'],
    changeDetection: ChangeDetectionStrategy.Default,
    providers: [
        { provide: DateAdapter, useClass: CustomDateAdapter },
        { provide: MAT_DATE_FORMATS, useValue: DATE_TH_FORMATS },
        { provide: LOCALE_ID, useValue: 'th-TH-u-ca-gregory' },
        { provide: MAT_DATE_LOCALE, useValue: 'th-TH' }
    ],
})
export class FormBillingComponent implements OnInit, AfterViewInit, OnDestroy {
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

    ///customer
    customer: any[];
    customerFilter = new FormControl('');
    filterCustomer: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

    branch: any;
    user: any
    type: any
    /**
     * Constructor
     */
    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseConfirmationService: FuseConfirmationService,
        private _fb: FormBuilder,
        private _Service: StockService,
        private _matDialog: MatDialog,
        private _router: Router,
        private _activatedRoute: ActivatedRoute,
        private _authService: AuthService
    ) {
        this.user = JSON.parse(localStorage.getItem('user'))

        this.Id = this._activatedRoute.snapshot.paramMap.get('id');
        this.itemProduct = this._activatedRoute.snapshot.data.invoice ?? [];
        this.filterItem.next(this.itemProduct.slice());

        this.customer = this._activatedRoute.snapshot.data.customer.data
        //.filter(e => e.type == 'agent')
        this.filterCustomer.next(this.customer.slice());
        this.type = this._activatedRoute.snapshot.data.status
        this.branch = this._activatedRoute.snapshot.data.branch

        this.form = this._fb.group({
            id: null,
            branche_id: null,
            customer_id: null,
            date: null,
            due_date: null,
            total: 0,
            remark: null,
            condition: null,
            billing_invoices: this._fb.array([])

        })
    }
    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    ngOnInit() {
        const currentDate = DateTime.now();
        const dueDate = currentDate.plus({ days: 30 }).toFormat('yyyy-MM-dd');

        if (this.Id) {

            this._Service.getById(this.Id, this.type).subscribe((resp: any) => {
                this.itemData = resp.data
                this.form.patchValue({
                    ...this.itemData,
                })
                this.customerFilter.setValue(this.itemData?.customers_name ?? '')
                this.itemData.billing_invoice.forEach(element => {
                    let item = this._fb.group({
                        id: element.id,
                        invoice_id: element.invoice_id,
                        invoice_no: element?.invoice?.no,
                        customer_name: element?.invoice?.customer_name,
                        customer_no : element?.invoice?.customer_no,
                        unit_price : element?.invoice?.total,
                        date : element?.invoice?.date,
                        due_date : element?.invoice?.due_date,
                    })
                    this.service().push(item)
                });
            })
        }
        else {
            this.form.patchValue({
                branche_id: this.user?.employees?.branch_id,
                customer_id: null,
                date: DateTime.now().toFormat('yyyy-MM-dd'),
                due_date: dueDate,
                total: 0,

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
                item.no.toLowerCase().indexOf(search) > -1
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

    private buildBillingPayload(): Record<string, unknown> | null {
        const raw = this.form.value;
        if (!raw.billing_invoices?.length) {
            this._fuseConfirmationService.open({
                title: 'กรุณาระบุข้อมูล',
                message: 'กรุณาเลือกใบแจ้งหนี้อย่างน้อย 1 รายการ',
                icon: { show: true, name: 'heroicons_outline:exclamation', color: 'warning' },
                actions: { confirm: { show: false, label: 'ยืนยัน', color: 'primary' }, cancel: { show: false, label: 'ยกเลิก' } },
                dismissible: true,
            });
            return null;
        }
        if (!raw.customer_id) {
            this._fuseConfirmationService.open({
                title: 'กรุณาระบุข้อมูล',
                message: 'กรุณาเลือกลูกค้า หรือเลือกใบแจ้งหนี้เพื่อดึงข้อมูลลูกค้า',
                icon: { show: true, name: 'heroicons_outline:exclamation', color: 'warning' },
                actions: { confirm: { show: false, label: 'ยืนยัน', color: 'primary' }, cancel: { show: false, label: 'ยกเลิก' } },
                dismissible: true,
            });
            return null;
        }

        return {
            branche_id: raw.branche_id,
            customer_id: raw.customer_id,
            date: raw.date,
            due_date: raw.due_date,
            total: raw.total ?? 0,
            remark: raw.remark,
            condition: raw.condition,
            billing_invoices: raw.billing_invoices.map((row: { invoice_id: number }) => ({
                invoice_id: row.invoice_id,
            })),
        };
    }

    private syncCustomerFromInvoice(invoice: { customer_id?: number; customer_name?: string; customer_no?: string }): void {
        if (!invoice?.customer_id) {
            return;
        }
        const currentId = this.form.get('customer_id')?.value;
        if (currentId && currentId !== invoice.customer_id) {
            this._fuseConfirmationService.open({
                title: 'แจ้งเตือน',
                message: 'ใบแจ้งหนี้ที่เลือกไม่ใช่ของลูกค้ารายเดียวกับรายการที่มีอยู่',
                icon: { show: true, name: 'heroicons_outline:exclamation', color: 'warning' },
                actions: { confirm: { show: false, label: 'ยืนยัน', color: 'primary' }, cancel: { show: false, label: 'ยกเลิก' } },
                dismissible: true,
            });
            return;
        }
        this.form.patchValue({ customer_id: invoice.customer_id });
        const cust = this.customer?.find((c) => c.id === invoice.customer_id);
        const label = cust
            ? `${cust.name ?? ''} ${cust.lname ?? ''}`.trim()
            : (invoice.customer_name ?? '');
        if (label) {
            this.customerFilter.setValue(label);
        }
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
                    const due_date = datePipe.transform(
                        this.form.value.due_date,
                      "yyyy-MM-dd"
                    );
                    this.form.patchValue({
                        date: date,
                        due_date: due_date,
                    })
                    const formValue = this.buildBillingPayload();
                    if (!formValue) {
                        return;
                    }

                    this._Service.udpateBilling(this.Id, formValue).subscribe({
                        next: (resp: any) => {
                            this._router.navigate(['document/list/billing']);
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
                                const due_date = datePipe.transform(
                                    this.form.value.due_date,
                                  "yyyy-MM-dd"
                                );
                                this.form.patchValue({
                                    date: date,
                                    due_date: due_date,
                                })
                    const formValue = this.buildBillingPayload();
                    if (!formValue) {
                        return;
                    }
                    this._Service.createBilling(formValue).subscribe({
                        next: (resp: any) => {
                            this._router.navigate(['document/list/billing']);
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
        this._router.navigate(['document/list/billing']);
    }

    onOptionProduct(event: any) {
        const selectedName = event.option.value;
        const selected = this.itemProduct.find(item => item.no === selectedName);

        if (selected) {
            const existingItem = this.service().controls.find((control) => control.get('invoice_id')?.value === selected.id);
            if (existingItem) {
                // alert('มีใบแจ้งหนี้นี้ในข้อมูลแล้ว')
                this._fuseConfirmationService.open({
                    title: "แจ้งเตือน",
                    message: 'มีใบแจ้งหนี้นี้ในข้อมูลแล้ว',
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
            } else {
                if (selected) {
                    if (
                        this.form.get('customer_id')?.value &&
                        selected.customer_id &&
                        this.form.get('customer_id')?.value !== selected.customer_id
                    ) {
                        this._fuseConfirmationService.open({
                            title: 'แจ้งเตือน',
                            message: 'ใบแจ้งหนี้นี้ไม่ใช่ของลูกค้ารายเดียวกับรายการที่มีอยู่',
                            icon: { show: true, name: 'heroicons_outline:exclamation', color: 'warning' },
                            actions: { confirm: { show: false, label: 'ยืนยัน', color: 'primary' }, cancel: { show: false, label: 'ยกเลิก' } },
                            dismissible: true,
                        });
                        this.itemFilter.setValue(null);
                        return;
                    }
                    this.syncCustomerFromInvoice(selected);
                    let item = this._fb.group({
                        invoice_id: selected.id,
                        invoice_no: selected.no,
                        customer_name: selected.customer_name,
                        customer_no: selected.customer_no,
                        date: selected.date,
                        type: selected.type,
                        due_date: selected.due_date,
                        unit_price: selected.total_amount,
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
    onOptionCustomer(event: any) {
        const selectedName = event.option.value;
        const selected = this.customer.find(item => item.name === selectedName);
        if (!selected) {
            return;
        }

        let formValue = {
            type : '',
            customer_id: selected.id
        }
        this._Service.getCustomerInvoice(formValue).subscribe((resp: any) => {
            this.itemProduct = resp.data ?? resp ?? [];
            this.filterItem.next(this.itemProduct.slice());

        })
        this.form.patchValue({
            name: selected.name,
            customer_id: selected.id
        })
        this.customerFilter.setValue(`${selected.name ?? ''} ${selected.lname ?? ''}`.trim());
    }

    private _filter(value: string): string[] {
        const filterValue = value.toLowerCase();

        return this.options.filter((option) =>
            option.toLowerCase().includes(filterValue)
        );
    }


    service(): FormArray {
        return this.form.get('billing_invoices') as FormArray;
    }

    newService(): FormGroup {
        return this._fb.group({
            invoice_id: null,
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
        const total = (qty * price) - validDiscount;

        item.patchValue({
            service_price: total
        }, { emitEvent: false }); // เพื่อป้องกันการเกิด loop ที่ไม่จำเป็น
    }

    subscribeValueChanges(item: FormGroup) {

    }

    calculateTotalForAllItems() {
        this.service().controls.forEach((item: FormGroup) => {
            this.calculateTotal(item);
            this.subscribeValueChanges(item);
        });
    }

    sumPrice() {
        let price1 = 0;
        this.form.value.billing_invoices.forEach((element) => {
            price1 += element.unit_price
        });

        this.form.patchValue({
            total: price1,
        });
    }

    changeDiscount() {
        let formValue = this.form.value
        let price3 = formValue.total - formValue.discount;
        const tax = parseFloat((price3 * 0.07).toFixed(2)); // คำนวณ VAT 7% และแปลงเป็นทศนิยม 2 ตำแหน่ง
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
}
