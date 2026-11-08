import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { ReplaySubject, Subject, takeUntil } from 'rxjs';
import { AddressDialogComponent } from '../address-dialog/address-dialog.component';

@Component({
    selector: 'app-vehicle-dialog',
    templateUrl: './vehicle-dialog.component.html',
    styleUrls: ['./vehicle-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.Default,
})

export class VehicleDialogComponent implements OnInit {
    dataRow: any[] = [];
    dtOptions: DataTables.Settings = {};
    formFieldHelpers: string[] = ['fuse-mat-dense'];
    flashMessage: 'success' | 'error' | null = null;
    form: FormGroup;
    order: any;
    gender: any = [
        {
            id: 'M',
            name: 'ชาย'
        },
        {
            id: 'F',
            name: 'หญิง'
        }
    ];
    status: any[] = [
        {
            name: 'บุคคลธรรมดา',
            value: 'personal'
        },
        {
            name: 'นิติบุคคล',
            value: 'vendor'
        },
    ]

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

    listVehicleInspection: any[] = []
    filteredInsuranceTypes: any[] = []
    brands: any[] = []
    models: any[] = []
    private isBrandSelected: boolean = true;
    constructor(private dialogRef: MatDialogRef<VehicleDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private formBuilder: FormBuilder,
        private _fuseConfirmationService: FuseConfirmationService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _service: Service,
        private _dialog: MatDialog
        
    ) {
        this.provinces = this.data.province
        this.brands = this.data.brands
        this.listVehicleInspection = this.data.listVehicleInspection
        this.filteredInsuranceTypes = this.data.filteredInsuranceTypes
        this.filterProvince.next(this.provinces.slice());
        this.form = this.formBuilder.group({
            customer_id: this.data.customer_id,
            registration_date: null,
            license_plate: null,
            province_id: null,
            vehicle_inspection_types_id: null,
            cc: null,
            fuel_type: 'oil',
            weight: null,
            brand_id: null,
            model_id: null,
            chassis_number: null,
            engine_number: null,
        })

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
            this.provinces.filter(item =>
                item.name_th.toLowerCase().indexOf(search) > -1
            )
        );
    }

    onSaveClick(): void {
        this.flashMessage = null;
        if (this.form.invalid) {
            this.form.enable();
            this._fuseConfirmationService.open({
                "title": "กรุณาระบุข้อมูล",
                "icon": {
                    "show": true,
                    "name": "heroicons_outline:exclamation",
                    "color": "warning"
                },
                "actions": {
                    "confirm": {
                        "show": false,
                        "label": "ยืนยัน",
                        "color": "primary"
                    },
                    "cancel": {
                        "show": false,
                        "label": "ยกเลิก",
                    }
                },
                "dismissible": true
            });
            return;
        }
        // Open the confirmation dialog
        const confirmation = this._fuseConfirmationService.open({
            "title": "เพิ่มข้อมูล",
            "message": "คุณต้องการเพิ่มข้อมูลใช่หรือไม่ ",
            "icon": {
                "show": false,
                "name": "heroicons_outline:exclamation",
                "color": "warning"
            },
            "actions": {
                "confirm": {
                    "show": true,
                    "label": "ยืนยัน",
                    "color": "primary"
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
                formValue.registration_date = moment(this.form.value.registration_date).format('YYYY-MM-DD')
                this._service.carCreate(formValue).subscribe({
                    next: (resp: any) => {
                        // แสดงข้อความสำเร็จ
                        this.showFlashMessage('success');
                        // ตรวจสอบว่ามี ID จาก resp หรือไม่
                        this.dialogRef.close(resp.data);
                    },
                    error: (err: any) => {
                        // เปิดการใช้งานฟอร์มอีกครั้ง
                        this.form.enable();

                        // แสดงข้อความแจ้งข้อผิดพลาด
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
                    }
                });

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
        this.dialogRef.close(item);
    }

 
    ngAfterViewInit(): void {
        this._changeDetectorRef.detectChanges();
    }

    pages = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    loadTable(): void {
        const that = this;
        this.dtOptions = {
            pagingType: "full_numbers",
            pageLength: 25,
            serverSide: true,
            processing: true,
            language: {
                url: "https://cdn.datatables.net/plug-ins/1.11.3/i18n/th.json",
            },
            ajax: (dataTablesParameters: any, callback) => {
                dataTablesParameters.status = null;
                dataTablesParameters.customer_id = this.data.customer_id;
                that._service.getPageCar(dataTablesParameters).subscribe((resp: any) => {
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
        const selected = this.provinces.find(item => item.name_th === selectedName);
        if (selected) {
            this.form.patchValue({
                province_id: selected.id
            })
            this.provinceFilter.setValue(selected.name_th); // ล้างค่าในช่อง input
        }
    }

    onBrandChange(): void {
        this.isBrandSelected = this.form.value.brand_id !== '';

        if (this.isBrandSelected) {
            this._service.getVehicleModel(this.form.value.brand_id).subscribe(
                (resp:any) => {
                    this.models = resp.data[0].vehicle_models || []
                }
            );
        }
    }
}
