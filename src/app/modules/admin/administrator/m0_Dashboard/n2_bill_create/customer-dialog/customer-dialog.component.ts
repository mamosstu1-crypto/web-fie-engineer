import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    Inject,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import {
    FormBuilder,
    FormControl,
    FormGroup,
    FormsModule,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import {
    MAT_DIALOG_DATA,
    MatDialog,
    MatDialogRef,
} from '@angular/material/dialog';
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
import { ReplaySubject, Subject, takeUntil } from 'rxjs';
import { AddressDialogInCustomerComponent } from '../address-dialog_incustomer/address-dialog.component';

@Component({
    selector: 'app-customer-dialog',
    templateUrl: './customer-dialog.component.html',
    styleUrls: ['./customer-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.Default,
})
export class CustomerDialogComponent implements OnInit {
    dataRow: any[] = [];
    dtOptions: DataTables.Settings = {};
    formFieldHelpers: string[] = ['fuse-mat-dense'];
    flashMessage: 'success' | 'error' | null = null;
    form: FormGroup;
    order: any;
    gender: any = [
        {
            id: 'M',
            name: 'ชาย',
        },
        {
            id: 'F',
            name: 'หญิง',
        },
    ];
    status: any[] = [
        {
            name: 'บุคคลธรรมดา',
            value: 'personal',
        },
        {
            name: 'นิติบุคคล',
            value: 'vendor',
        },
        {
            name: 'ตัวแทน',
            value: 'agent',
        },
    ];

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

    customerTitles = {
        personal: ['คุณ', 'นาย', 'นางสาว', 'นาง'],
        vendor: ['บริษัท', 'ห้างหุ้นส่วนจำกัด'],
        agent: ['คุณ', 'นาย', 'นางสาว', 'นาง', 'บริษัท', 'ห้างหุ้นส่วนจำกัด'],
    };

    filteredTitles: string[] = this.customerTitles['personal'];

    constructor(
        private dialogRef: MatDialogRef<CustomerDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private formBuilder: FormBuilder,
        private _fuseConfirmationService: FuseConfirmationService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _service: Service,
        private _dialog: MatDialog
    ) {
        this.provinces = this.data.province;
        this.filterProvince.next(this.provinces.slice());

        this.form = this.formBuilder.group({
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

            customer_id: '',
            province_id: ['' , Validators.required],
            district_id: ['' , Validators.required],
            subdistrict_id: ['' , Validators.required],
            address: ['' , Validators.required],
            zip_code: ['' , Validators.required],
        });
    }

    ngOnInit(): void {
        if (this.data.type === 'LIST') {
            this.loadTable();
        }

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

        this.form.get('type').valueChanges.subscribe((value) => {
            this.toggleHeadquarterVisibility(value);
            this.filteredTitles = this.customerTitles[value] || [];
        });

        this.toggleHeadquarterVisibility(this.form.get('type').value);
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
            this.provinces.filter(
                (item) => item.name_th.toLowerCase().indexOf(search) > -1
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
            this.districts.filter(
                (item) => item.name_th.toLowerCase().indexOf(search) > -1
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
            this.subdistricts.filter(
                (item) => item.name_th.toLowerCase().indexOf(search) > -1
            )
        );
    }

    onSaveClick(): void {
        this.flashMessage = null;
        if (this.form.invalid) {
            this.form.enable();
            this._fuseConfirmationService.open({
                title: 'กรุณาระบุข้อมูล',
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
        // Open the confirmation dialog
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
                    color: 'primary',
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
            // if (result === 'confirmed') {
            //     let formValue = this.form.value;
            //     // formValue.date = moment(formValue.date).format('YYYY-MM-DD')
            //     this._service.customerCreate(formValue).subscribe({
            //         next: (resp: any) => {
            //             // แสดงข้อความสำเร็จ
            //             this.showFlashMessage('success');
            //             // ตรวจสอบว่ามี ID จาก resp หรือไม่
            //             if (resp.data && resp.data.id) {
            //                 const customerId = resp.data.id;
            //                 let formvalue = {
            //                     customer_id: customerId,
            //                     province_id: this.form.value.province_id,
            //                     district_id: this.form.value.district_id,
            //                     subdistrict_id: this.form.value.subdistrict_id,
            //                     address: this.form.value.address,
            //                     zip_code: this.form.value.zip_code,
            //                 };
            //                 // ยิง API เส้นที่ 2
            //                 this._service
            //                     .customerCreateAddress(formvalue)
            //                     .subscribe({
            //                         next: (additionalData: any) => {
            //                             let returnData = {
            //                                 customer: resp.data,
            //                                 address: additionalData.data,
            //                             };
            //                             // ปิด Dialog พร้อมส่งข้อมูลที่ได้รับกลับ
            //                             this.dialogRef.close(returnData);
            //                             // ทำสิ่งที่ต้องการกับข้อมูลเพิ่มเติม
            //                         },
            //                         error: (err: any) => {
            //                             console.error(
            //                                 'เกิดข้อผิดพลาดในการเรียก API เส้นที่ 2:',
            //                                 err
            //                             );
            //                         },
            //                     });
            //             }
            //         },
            //         error: (err: any) => {
            //             // เปิดการใช้งานฟอร์มอีกครั้ง
            //             this.form.enable();

            //             // แสดงข้อความแจ้งข้อผิดพลาด
            //             this._fuseConfirmationService.open({
            //                 title: 'กรุณาระบุข้อมูล',
            //                 message: err.error.message,
            //                 icon: {
            //                     show: true,
            //                     name: 'heroicons_outline:exclamation',
            //                     color: 'warning',
            //                 },
            //                 actions: {
            //                     confirm: {
            //                         show: false,
            //                         label: 'ยืนยัน',
            //                         color: 'primary',
            //                     },
            //                     cancel: {
            //                         show: false,
            //                         label: 'ยกเลิก',
            //                     },
            //                 },
            //                 dismissible: true,
            //             });
            //         },
            //     });
            // }
        });
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
        this.dialog(item);
        // ตรวจสอบว่าค่า address เป็น null หรือไม่
        // if (
        //     !item.customer__addresses ||
        //     item.customer__addresses.length === 0
        // ) {
        //     // หาก address เป็น null หรือว่าง
        //     this.dialog(item);

        //     // this.dialogRef.close(item);
        // } else {
        //     this.addressDialog(item);
        //     // หาก address มีค่าและมี length มากกว่า 0
        // }
    }
    dialog(value: any) {
        let returnData = {
            customer: value,
            address: null,
        };
        this.dialogRef.close(returnData);
    }
    addressDialog(value: any) {
        const dialogRef = this._dialog.open(AddressDialogInCustomerComponent, {
            width: '900px',
            maxHeight: '90vh',
            data: value.customer__addresses,
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                let returnData = {
                    customer: value,
                    address: result,
                };
                this.dialogRef.close(returnData);
            }
        });
    }

    ngAfterViewInit(): void {
        this._changeDetectorRef.detectChanges();
    }

    pages = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    loadTable(): void {
        const that = this;
        this.dtOptions = {
            pagingType: 'full_numbers',
            pageLength: 25,
            serverSide: true,
            processing: true,
            language: {
                url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/th.json',
            },
            ajax: (dataTablesParameters: any, callback) => {
                dataTablesParameters.status = null;
                that._service
                    .getPageCustomer(dataTablesParameters)
                    .subscribe((resp: any) => {
                        this.dataRow = resp.data;
                        this.pages.current_page = resp.current_page;
                        this.pages.last_page = resp.last_page;
                        this.pages.per_page = resp.per_page;
                        if (resp.current_page > 1) {
                            this.pages.begin =
                                resp.per_page * resp.current_page - 1;
                        } else {
                            this.pages.begin = 0;
                        }

                        callback({
                            recordsTotal: resp.total,
                            recordsFiltered: resp.total,
                            data: [],
                        });
                        this._changeDetectorRef.markForCheck();
                    });
            },
            columns: [
                { data: 'action', orderable: false },
                { data: 'No' },
                { data: 'name' },
                { data: 'create_by' },
                { data: 'created_at' },
            ],
        };
    }

    selectProvince(event: any) {
        const selectedName = event.option.value;
        const selected = this.provinces.find(
            (item) => item.name_th === selectedName
        );

        if (selected) {
            this._service.getDistrict(selected.id).subscribe((resp: any) => {
                this.districts = resp.data[0].districts;
                this.filterDistrict.next(this.districts.slice());
            });
            this.form.patchValue({
                province_id: selected.id,
            });
            this.provinceFilter.setValue(selected.name_th); // ล้างค่าในช่อง input
        }
    }

    selectDistrict(event: any) {
        const selectedName = event.option.value;
        const selected = this.districts.find(
            (item) => item.name_th === selectedName
        );

        if (selected) {
            this._service.getSubdistrict(selected.id).subscribe((resp: any) => {
                this.subdistricts = resp.data[0].sub_districts;
                this.filterSubdistrict.next(this.subdistricts.slice());
            });
            this.form.patchValue({
                district_id: selected.id,
            });
            this.districtFilter.setValue(selected.name_th); // ล้างค่าในช่อง input
        }
    }

    selectSubDistrict(event: any) {
        const selectedName = event.option.value;
        const selected = this.subdistricts.find(
            (item) => item.name_th === selectedName
        );

        if (selected) {
            this.form.patchValue({
                subdistrict_id: selected.id,
                zip_code: selected.zip_code,
            });
            this.subdistrictFilter.setValue(selected.name_th); // ล้างค่าในช่อง input
        }
    }

    onTitleSelected(title: string): void {
        this.form.patchValue({ name: title });
    }

    toggleHeadquarterVisibility(type: string): void {
        const headquarterControl = this.form.get('is_headquarter');
        if (type === 'vendor' || type === 'agent') {
            headquarterControl.enable();
        } else {
            headquarterControl.disable();
            headquarterControl.setValue('0');
        }
    }
}
