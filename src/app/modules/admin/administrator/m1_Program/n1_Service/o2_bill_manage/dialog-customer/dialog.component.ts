import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule, NgClass } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatRadioModule } from '@angular/material/radio';
import moment from 'moment';
import { DataTablesModule } from 'angular-datatables';
import { Service } from '../page.service';
import { catchError, ReplaySubject, Subject, takeUntil, throwError } from 'rxjs';

@Component({
    selector: 'app-edit-dialg-customer',
    templateUrl: './dialog.component.html',
    styleUrls: ['./dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.Default,
})

export class EditDialogComponent implements OnInit {
    dataRow: any[] = [];
    dtOptions: DataTables.Settings = {};
    formFieldHelpers: string[] = ['fuse-mat-dense'];
    flashMessage: 'success' | 'error' | null = null;
    form: FormGroup;
    order: any;
    status: any[] = [
        {
            name: 'บุคคลธรรมดา',
            value: 'personal'
        },
        {
            name: 'นิติบุคคล',
            value: 'vendor'
        },
        {
            name: 'ตัวแทน',
            value: 'agent'
        },
    ]

    customer: any;
    customerFilter = new FormControl('');
    filterCustomer: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
    //item
    provinces: any;
    provinceFilter = new FormControl('');
    filterProvince: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

    districts: any;
    districtFilter = new FormControl('');
    filterDistrict: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

    subdistricts: any;
    subdistrictFilter = new FormControl('');
    filterSubdistrict: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
    formBill: FormGroup;
    itemData: any;
    constructor(private dialogRef: MatDialogRef<EditDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private formBuilder: FormBuilder,
        private _fuseConfirmationService: FuseConfirmationService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _service: Service,
        private _dialog: MatDialog

    ) {

        this.formBill = this.formBuilder.group({
            appointment: [null],
            employee_id: [null],
            date: [null],
            remark: [''],
            total: [null],
            discount: [null],

            // รถ
            vehicle_id: [null],
            vehicle_inspection_types_id: [null],
            insurance_types_id: [null],
            license_plate: [''],
            province_id: [null],
            regeister_date: [null],
            cc: [''],
            weight: [''],
            tax_due_date: [null],
            tax_renewal_date: [null],
            fuel_type: [''],
            type_document: [''],

            // ลูกค้า
            customer_id: [null],
            name: [''],
            email: [''],
            phone_number1: [''],
            phone_number2: [''],
            tax_id: [''],
            type: [''],
            is_headquarter: [false],

            // พ.ร.บ.
            date_start_prb: [null],
            date_end_prb: [null],
            insurance_names_id_prb: [null],
            stamp_prb: [''],
            tax_prb: [''],
            amount_paid_prb: [''],

            // ประกัน
            date_start: [null],
            date_end: [null],
            insurance_names_id: [null],
            insurance_renewal_type_id: [null],
            amount_paid: [''],

            // รายการบริการ
            List_service_tran: this.formBuilder.array([])
        });

        this.form = this.formBuilder.group({
            customer_id: this.data.customer_id,
            name: ['', Validators.required],
            lname: '',
            email: '',
            tax_id: '',
            company: '',
            phone_number1: ['', Validators.required],
            phone_number2: '',
            is_headquarter: '1',
            is_backoffice: '0',
            type: 'personal',
            province_id: ['', Validators.required],
            district_id: ['', Validators.required],
            subdistrict_id: ['', Validators.required],
            address: ['', Validators.required],
            zip_code: ['', Validators.required],
        });

        this._service.getCustomer().subscribe((resp: any) => {
            this.customer = resp.data
            this.filterCustomer.next(this.customer.slice());

        })

        this._service.getData(this.data.id).subscribe((billData: any) => {
            this.itemData = billData?.data ?? {}

            const vehicle = billData?.data?.inspection_vehicles?.[0]
            const insurance_data = billData?.data?.insurance_data ?? {}

            this.formBill.patchValue({
                ...this.itemData,

                // รถ
                vehicle_id: vehicle?.vehicle_id ?? null,
                vehicle_inspection_types_id: vehicle?.vehicle?.vehicle_inspection_types_id ?? null,
                insurance_types_id: vehicle?.vehicle?.insurance_types_id ?? null,
                license_plate: vehicle?.vehicle?.license_plate ?? '',
                province_id: vehicle?.vehicle?.province_id ?? null,
                regeister_date: vehicle?.vehicle?.registration_date ?? null,
                cc: vehicle?.vehicle?.cc ?? null,
                weight: vehicle?.vehicle?.weight ?? null,
                tax_due_date: vehicle?.vehicle?.notificate_tax ?? null,
                tax_renewal_date: vehicle?.vehicle?.tax_renewal_date ?? null,
                fuel_type: vehicle?.vehicle?.fuel_type ?? '',
                type_document: vehicle?.vehicle?.type_document ?? '',

                // พ.ร.บ.
                date_start_prb: insurance_data?.prb?.date_end ?? null,
                date_end_prb: insurance_data?.prb?.date_start ?? null,
                insurance_names_id_prb: insurance_data?.prb?.insurance_names_id ?? null,
                stamp_prb: insurance_data?.prb?.stamp ?? null,
                tax_prb: insurance_data?.prb?.tax ?? null,
                amount_paid_prb: insurance_data?.prb?.amount_paid ?? null,

                // ประกัน
                date_start: insurance_data?.insurance?.date_start ?? null,
                date_end: insurance_data?.insurance?.date_end ?? null,
                insurance_names_id: insurance_data?.insurance?.insurance_names_id ?? null,
                insurance_renewal_type_id: insurance_data?.insurance?.insurance_renewal_type_id ?? null,
                amount_paid: insurance_data?.insurance?.amount_paid ?? null,
            })

            // ตรวจสอบก่อนวน loop
            if (vehicle?.vehicle_service_transaction?.length) {
                for (let i = 0; i < vehicle.vehicle_service_transaction.length; i++) {
                    const element = vehicle.vehicle_service_transaction[i]
                    this.addService(element?.service_id ?? null, element?.service_price ?? 0)
                }
            }
        })


        this._service.getProvinces().subscribe((resp: any) => {
            this.provinces = resp;
            this.filterProvince.next(this.provinces.slice());

            this._service.getCustomerById(this.data.customers.id).subscribe((cus: any) => {
                const dataCus = cus?.data?.customer__addresses?.[0];
                if (!dataCus) return;

                this._service.getDistricts(dataCus.province_id).subscribe((districts: any) => {
                    this.districts = districts?.districts || [];
                    this.filterDistrict.next(this.districts.slice());

                    const provinceName = dataCus?.provinces?.name_th || '';
                    const districtName = dataCus?.districts?.name_th || '';
                    const subdistrictName = dataCus?.sub_districts?.name_th || '';

                    this.provinceFilter.setValue(provinceName);
                    this.districtFilter.setValue(districtName);
                    this.subdistrictFilter.setValue(subdistrictName);

                    this._service.getSubdistrict(dataCus.district_id).subscribe((subdistricts: any) => {
                        this.subdistricts = subdistricts?.data || [];
                        this.filterSubdistrict.next(this.subdistricts.slice());

                        this.form.patchValue({
                            ...cus?.data,
                            address: dataCus?.address || '',
                            zip_code: dataCus?.zip_code || '',
                            district_id: dataCus?.district_id || null,
                            subdistrict_id: dataCus?.subdistrict_id || null,
                            province_id: dataCus?.province_id || null,
                            is_headquarter: this.data.customers?.is_headquarter || 0
                        });
                    });
                });
            });
        });
    }

    ngOnInit(): void {
        this.provinceFilter.valueChanges
            .pipe(takeUntil(this._onDestroy))
            .subscribe(() => {
                this._filterProvince();
            });

        this.districtFilter.valueChanges
            .pipe(takeUntil(this._onDestroy))
            .subscribe(() => {
                this._filterDistrict();
            });

        this.subdistrictFilter.valueChanges
            .pipe(takeUntil(this._onDestroy))
            .subscribe(() => {
                this._filterSubdistrict();
            });
        this.customerFilter.valueChanges
            .pipe(takeUntil(this._onDestroy))
            .subscribe(() => {
                this._filterCustomer();
            });






    }

    addService(service_id: number = null, service_price: number = null): void {
        const serviceGroup = this.formBuilder.group({
            service_id: [service_id],
            service_price: [service_price]
        });
        (this.formBill.get('List_service_tran') as FormArray).push(serviceGroup);
    }
    /**

     * On destroy
     */
    protected _onDestroy = new Subject<void>();
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._onDestroy.next();
        this._onDestroy.complete();
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
                (item.name && item.name.toLowerCase().includes(search)) ||
                (item.lname && item.lname.toLowerCase().includes(search))
            )
        );
    }


    protected _filterProvince() {
        if (!this.provinces) {
            return;
        }
        let search = this.provinceFilter.value;
        if (!search) {
            this.filterProvince.next(this.provinces.slice());
            return;
        } else {
            search = search.toLowerCase();
        }
        this.filterProvince.next(
            this.provinces.filter(item =>
                item.name_th.toLowerCase().indexOf(search) > -1
            )
        );
    }

    protected _filterDistrict() {
        if (!this.districts) {
            return;
        }
        let search = this.districtFilter.value;
        if (!search) {
            this.filterDistrict.next(this.districts.slice());
            return;
        } else {
            search = search.toLowerCase();
        }
        this.filterDistrict.next(
            this.districts.filter(item =>
                item.name_th.toLowerCase().indexOf(search) > -1
            )
        );
    }

    protected _filterSubdistrict() {
        if (!this.subdistricts) {
            return;
        }
        let search = this.subdistrictFilter.value;
        if (!search) {
            this.filterSubdistrict.next(this.subdistricts.slice());
            return;
        } else {
            search = search.toLowerCase();
        }
        this.filterSubdistrict.next(
            this.subdistricts.filter(item =>
                item.name_th.toLowerCase().indexOf(search) > -1
            )
        );
    }

    onSaveClick(): void {
        this.flashMessage = null;
        // Open the confirmation dialog
        const confirmation = this._fuseConfirmationService.open({
            "title": "ยืนยันข้อมูล",
            "message": "คุณต้องการยืนยันข้อมูลใช่หรือไม่ ",
            "icon": {
                "show": false,
                "name": "heroicons_outline:exclamation",
                "color": "warning"
            },
            "actions": {
                "confirm": {
                    "show": true,
                    "label": "ยืนยัน",
                    "color": "sky"
                },
                "cancel": {
                    "show": true,
                    "label": "ยกเลิก"
                }
            },
            "dismissible": true
        });

        // Subscribe to the confirmation dialog closed action
        confirmation.afterClosed().subscribe((result) => {
            if (result === 'confirmed') {
                let formValue = this.form.value;
                if (formValue.customer_id) {
                    this.formBill.patchValue({
                        customer_id: formValue.customer_id,
                        name: formValue.name,
                        lname: formValue.lname,
                        phone_number1: formValue.phone_number1,
                        phone_number2: formValue.phone_number2,
                        email: formValue.email,
                        tax_id: formValue.tax_id,
                        type: formValue.type,
                        is_headquarter: formValue.is_headquarter,
                    })
                    let formValueBill = this.formBill.value
                    this._service.update(formValueBill, this.data.id,).pipe(
                        catchError(error => {
                            console.error('Error creating customer address:', error);
                            alert('ไม่สามารถบันทึกข้อมูลได้');
                            return throwError(() => error);
                        })
                    ).subscribe((respBill: any) => {
                        this.dialogRef.close(respBill);
                    });
                } else {
                    const newCustomer = {
                        name: formValue.name,
                        lname: formValue.lname,
                        phone_number1: formValue.phone_number1,
                        phone_number2: formValue.phone_number2,
                        email: formValue.email,
                        tax_id: formValue.tax_id,
                        type: formValue.type,
                        is_headquarter: formValue.is_headquarter,
                        is_backoffice: formValue.is_backoffice,
                    };
                    this._service.createCustomer(newCustomer).pipe(
                        catchError(error => {
                            console.error('Error creating customer:', error);
                            alert('ไม่สามารถสร้างลูกค้าได้');
                            return throwError(() => error);
                        })
                    ).subscribe((addCus: any) => {
                        const newAddress = {
                            customer_id: addCus.data.id,
                            province_id: formValue.province_id,
                            district_id: formValue.district_id,
                            subdistrict_id: formValue.subdistrict_id,
                            address: formValue.address,
                            is_main: 1,
                            zip_code: formValue.zip_code,
                        };

                        this._service.createCustomerAddress(newAddress).pipe(
                            catchError(error => {
                                console.error('Error creating customer address:', error);
                                alert('ไม่สามารถสร้างที่อยู่ลูกค้าได้');
                                return throwError(() => error);
                            })
                        ).subscribe((addCusAddress: any) => {
                            this.formBill.patchValue({
                                customer_id: addCus.data.id,
                                name: formValue.name,
                                lname: formValue.lname,
                                phone_number1: formValue.phone_number1,
                                phone_number2: formValue.phone_number2,
                                email: formValue.email,
                                tax_id: formValue.tax_id,
                                type: formValue.type,
                                is_headquarter: formValue.is_headquarter,
                            })
                            let formValueBill = this.formBill.value
                            this._service.update(formValueBill, this.data.id,).pipe(
                                catchError(error => {
                                    console.error('Error creating customer address:', error);
                                    alert('ไม่สามารถบันทึกข้อมูลได้');
                                    return throwError(() => error);
                                })
                            ).subscribe((respBill: any) => {
                                this.dialogRef.close(respBill);
                            });
                        });
                    });

                }

            }
        })
    }

    onCancelClick(): void {
        this.dialogRef.close();
    }

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


    onSelect(item: any) {
        // ตรวจสอบว่าค่า address เป็น null หรือไม่
        if (!item.customer__addresses || item.customer__addresses.length === 0) {
            // หาก address เป็น null หรือว่าง
            this.dialog(item)

            // this.dialogRef.close(item);
        } else {
            this.addressDialog(item)
            // หาก address มีค่าและมี length มากกว่า 0

        }
    }
    dialog(value: any) {
        let returnData = {
            customer: value,
            address: null
        }
        this.dialogRef.close(returnData);
    }
    addressDialog(value: any) {

    }

    ngAfterViewInit(): void {
        this._changeDetectorRef.detectChanges();
    }

    selectCustomer(event: any) {
        const selectedId = event.option.value;
        const selected = this.customer.find(item => item.id === selectedId);
        if (selected) {
            this._service.getCustomerById(selected.id).subscribe((resp: any) => {
                const address = resp.data.customer__addresses[0]
                this.form.patchValue({
                    ...selected,
                    customer_id: selected.id,
                    province_id: address.province_id,
                    district_id: address.district_id,
                    subdistrict_id: address.subdistrict_id,
                    address: address.address,
                    zip_code: address.zip_code,
                });

                const provinceName = address?.provinces?.name_th || '';
                const districtName = address?.districts?.name_th || '';
                const subdistrictName = address?.sub_districts?.name_th || '';

                this.provinceFilter.setValue(provinceName);
                this.districtFilter.setValue(districtName);
                this.subdistrictFilter.setValue(subdistrictName);
            })


            this.customerFilter.setValue(''); // ล้างช่องค้นหา
        }
    }

    selectProvince(event: any) {
        const selectedName = event.option.value;
        const selected = this.provinces.find(item => item.name_th === selectedName);

        if (selected) {
            this._service.getDistrict(selected.id).subscribe((resp: any) => {
                this.districts = resp.data[0].districts
                this.filterDistrict.next(this.districts.slice());
            })
            this.form.patchValue({
                province_id: selected.id
            })
            this.provinceFilter.setValue(selected.name_th); // ล้างค่าในช่อง input
        }
    }

    selectDistrict(event: any) {
        const selectedName = event.option.value;
        const selected = this.districts.find(item => item.name_th === selectedName);

        if (selected) {
            this._service.getSubdistrict(selected.id).subscribe((resp: any) => {
                this.subdistricts = resp.data[0].sub_districts
                this.filterSubdistrict.next(this.subdistricts.slice());
            })
            this.form.patchValue({
                district_id: selected.id
            })
            this.districtFilter.setValue(selected.name_th); // ล้างค่าในช่อง input
        }
    }

    selectSubDistrict(event: any) {
        const selectedName = event.option.value;
        const selected = this.subdistricts.find(item => item.name_th === selectedName);

        if (selected) {
            this.form.patchValue({
                subdistrict_id: selected.id,
                zip_code: selected.zip_code
            })
            this.subdistrictFilter.setValue(selected.name_th); // ล้างค่าในช่อง input
        }
    }

    clearForm() {
        this.form.patchValue({
            customer_id: '',
            name: [''],
            lname: '',
            email: '',
            tax_id: '',
            company: '',
            phone_number1: [''],
            phone_number2: '',
            is_headquarter: 0,
            is_backoffice: '0',
            type: 'personal',
            province_id: [''],
            district_id: [''],
            subdistrict_id: [''],
            address: [''],
            zip_code: [''],
        })
        this.provinceFilter.setValue('')
        this.districtFilter.setValue('')
        this.subdistrictFilter.setValue('')
    }
}
