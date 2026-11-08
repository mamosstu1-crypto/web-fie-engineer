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
import { environment } from 'environments/environment';
import { UtilityService, DATE_TH_FORMATS, CustomDateAdapter } from 'app/app.utility-service';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'form-invoice',
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
export class FormInvoiceComponent implements OnInit, AfterViewInit, OnDestroy {
    formFieldHelpers: string[] = ['fuse-mat-dense'];
    form: FormGroup;
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
    ///customer
    customer: any;
    customerFilter = new FormControl('');
    filterCustomer: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

    branch: any;
    user: any
    quotationId: any
    pdfSrc: string = ''
    quotaNo: any = '';
    type: any = '';
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

        this.itemProduct = this._activatedRoute.snapshot.data.service
        this.filterItem.next(this.itemProduct.slice());

        this.customer = this._activatedRoute.snapshot.data.customer.data
        this.filterCustomer.next(this.customer.slice());

        this.branch = this._activatedRoute.snapshot.data.branch
        this.type = this._activatedRoute.snapshot.data.status
        this.form = this._fb.group({
            id: null,
            branche_id: null,
            quotation_id: null,
            date: null,
            due_date: null,
            remark: null,
            withholding_tax: 'N',
            withholding_tax_percent: 0
        })
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    ngOnInit() {
        const currentDate = DateTime.now();
        const validUntil = currentDate.plus({ days: 30 }).toFormat('yyyy-MM-dd');
        if (this.Id) {
            this._Service.getById(this.Id, this.type).subscribe((resp: any) => {
                this.itemData = resp.data
                this.form.patchValue({
                    ...this.itemData,
                })
                this.quotaNo = this.itemData?.quotation?.no
                this.pdfSrc = environment.API_URL + '/api/quotation/report/' + this.itemData.quotation_id;
            })
        }
        else {
            this.quotationId = this._activatedRoute.snapshot.paramMap.get('quotation_id');
            this.form.patchValue({
                branche_id: this.user?.employees?.branch_id,
                quotation_id: this.quotationId,
                date: DateTime.now().toFormat('yyyy-MM-dd'),
                due_date: validUntil,
            })

            this._Service.getById(this.quotationId, 'quotation').subscribe((resp:any)=>{
                this.quotaNo = resp.data.no
                this._changeDetectorRef.markForCheck()
            })

            this.pdfSrc = environment.API_URL + '/api/quotation/report/' + this.quotationId;
            this._changeDetectorRef.markForCheck()
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
                    let formValue = this.form.value

                    this._Service.updateInvoice(this.Id, formValue).subscribe({
                        next: (resp: any) => {
                            this._router.navigate(['document/list/invoice']);
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
                    let formValue = this.form.value
                    this._Service.createInvoice(formValue).subscribe({
                        next: (resp: any) => {
                            this._router.navigate(['document/list/invoice']);

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
        this._router.navigate(['document/list/invoice']);
    }

    onOptionCustomer(event: any) {
        const selectedName = event.option.value;
        const selected = this.customer.find(item => item.name === selectedName);

        if (selected) {
            this.form.patchValue({
                name: selected.name,
                customer_id: selected.id
            })
            this.customerFilter.setValue(selected.name); // ล้างค่าในช่อง input
        }
    }

    private formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0]; //YYYY-MM-DD
    }
}



