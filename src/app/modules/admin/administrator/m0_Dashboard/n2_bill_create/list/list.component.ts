// Angular core imports
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
import {
    AbstractControl,
    FormArray,
    FormBuilder,
    FormControl,
    FormGroup,
    Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
    DateAdapter,
    MAT_DATE_FORMATS,
    MAT_DATE_LOCALE,
} from '@angular/material/core';

// Angular Material imports
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';

// RxJS imports
import {
    map,
    Observable,
    of,
    startWith,
    switchMap,
    tap,
    Subject,
    firstValueFrom,
    lastValueFrom,
    forkJoin,
} from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';

// Custom imports
import { DatePipe, DecimalPipe } from '@angular/common';
import { DataTableDirective } from 'angular-datatables';
import { fuseAnimations } from '@fuse/animations';
import { FuseConfirmationService } from '@fuse/services/confirmation';

import { Service } from '../page.service';
import { DataPosition, AssetType, Pagination } from '../page.types';
import { FormDataFrame } from './list.mainframe';
import {
    UtilityService,
    DATE_TH_FORMATS,
    CustomDateAdapter,
} from 'app/app.utility-service';
import { FormDataService } from 'app/modules/matdynamic/form-data.service';
import { environment } from 'environments/environment';

import { AddressDialogComponent } from '../address-dialog/address-dialog.component'; // import ตัว AddressDialogComponent
import { add } from 'lodash';
import { EmsDialogComponent } from '../ems-dialog/ems-dialog.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { CustomerDialogComponent } from '../customer-dialog/customer-dialog.component';

@Component({
    selector: 'list',
    templateUrl: './list.component.html',
    styleUrls: ['./list.component.scss'],
    providers: [
        { provide: DateAdapter, useClass: CustomDateAdapter },
        { provide: MAT_DATE_FORMATS, useValue: DATE_TH_FORMATS },
        { provide: LOCALE_ID, useValue: 'th-TH-u-ca-gregory' },
        { provide: MAT_DATE_LOCALE, useValue: 'th-TH' },
        DecimalPipe,
    ],
    animations: fuseAnimations,
})
export class ListComponent implements OnInit, AfterViewInit, OnDestroy {
    /**
     *
     * @function ฟังก์ชันหลักจะถูกประกาศในรูปแบบปกติคือ name(): <returntype> {}
     * @function โดยทั่วไปฟังก์ชันที่มีหน้าที่แค่สนับสนุนฟังก์ชันหลักโดยจะมีรูปแบบ private name(): <returntype> {}
     *  **ประกาศไว้ด้านใต้ฟังก์ชันหลักที่สนับสนุน
     *  **ไม่เสมอไปเนื่องจากมีผู้พัฒนาหลายคน
     * @function ฟังก์ชันความสำคัญสูงจะมีรูปแบบ private _name(): <returntype> {}
     *  **การแก้ไขฟังก์ชันความสำคัญสูงจะไม่เห็นผลลัพธ์ที่ชัดเจน แต่อาจสร้างความเสียหายให้กับข้อมูลที่ถูกส่งไปยัง Backend ได้ โปรดระมัดระวังในการแก้ไข
     *  **ไม่เสมอไปเนื่องจากมีผู้พัฒนาหลายคน
     */
    // #region Variable declaration area
    /** Table/Form declare */
    public dtOptions: DataTables.Settings = {};
    public dataRow2: any[] = [];
    public dataGrid: any[];

    public formData: FormGroup;
    public prb_service_cache: FormControl;

    public formData_vehicle: FormGroup;
    public formData_address: FormGroup;
    public formData_addresscustomer: FormGroup;
    public formData_addressems: FormGroup;
    public formData_PaidData: FormGroup;
    public formData_Customer: FormGroup;
    public formData_ActPeriod: FormGroup;
    public formData_InsurData: FormGroup;
    public formData_WithholdingTax: FormGroup;

    // customer_car
    public formData_CusCar: FormGroup;
    public formGas_Edit: FormGroup;
    public formGas_Add: FormGroup;

    // customer_data
    public formData_CusData: FormGroup;
    public formAddress_CusData: FormGroup;

    // carcheck
    public formData_CarCheck: FormGroup;

    /** Dialog declare */
    @ViewChildren(DataTableDirective) dtElements: QueryList<DataTableDirective>;
    @ViewChild('AddressDialog') AddressDialog: TemplateRef<any>;
    @ViewChild('AddressDialog2') AddressDialog2: TemplateRef<any>;
    @ViewChild('WithholdingTax') WithholdingTax: TemplateRef<any>;
    @ViewChild('paidType') paidType: TemplateRef<any>;
    @ViewChild('TransecInform') TransecInform: TemplateRef<any>;
    @ViewChild('ActPeriod') ActPeriod: TemplateRef<any>;
    @ViewChild('InsurData') InsurData: TemplateRef<any>;
    @ViewChild('LackOfTax') LackOfTax: TemplateRef<any>;
    @ViewChild('DocImage') DocImage: TemplateRef<any>;
    @ViewChild('AddGasDialog') AddGasDialog: TemplateRef<any>;
    @ViewChild('AddressSelectionDialog')
    AddressSelectionDialog: TemplateRef<any>;
    @ViewChild('AddressSelectionDialogems')
    AddressSelectionDialogems: TemplateRef<any>;
    @ViewChild('AddressDialogcustomer') AddressDialogcustomer: TemplateRef<any>;
    isAutoPatch = false;
    public WithholdingTaxRef: MatDialogRef<any> | undefined;
    public addressDialogRef: MatDialogRef<any> | undefined;
    public addressDialog2Ref: MatDialogRef<any> | undefined;
    public paidTypeRef: MatDialogRef<any> | undefined;
    public transecInformRef: MatDialogRef<any> | undefined;
    public actPeriodRef: MatDialogRef<any> | undefined;
    public insurDataRef: MatDialogRef<any> | undefined;
    public lackOfTaxRef: MatDialogRef<any> | undefined;
    public docImageRef: MatDialogRef<any> | undefined;
    public addGasDialogRef: MatDialogRef<any> | undefined;
    public addressSelectionDialogRef: MatDialogRef<any> | undefined;
    public addressSelectionDialogemsRef: MatDialogRef<any> | undefined;
    public AddressDialogcustomerRef: MatDialogRef<any> | undefined;

    /** CRUD Operations respones storage */
    public createResp: any[] = [];
    public updateResp: any[] = [];
    public deleteResp: any[] = [];
    public outputState: string = 'create';

    /** GET partition data */
    public listProvinces: any[] = [];
    public listdistricts: any[] = [];
    public listSubDistricts: any[] = [];
    public listcustomer: any[] = [];
    public listcustomerNo: any[] = [];
    public listVehicles: any[] = [];
    public list: any[] = [];
    public listEmployee: any[] = [];
    public listBranch: any[] = [];
    public listVehicleInspection: any[] = [];
    public listInsuranceName: any[] = [];
    public listInsurRenewType: any[] = [];
    public listGasBrands: any[] = [];

    public listVehicleInspectionTypes: any;
    public listInsuranceTypes: any;

    public isVehicleTypeSelected: boolean = false;

    public isTaxChecked: boolean = false;
    public isLPGChecked: boolean = false;
    public isNGVChecked: boolean = false;
    public isActChecked: boolean = false;
    public isInsurChecked: boolean = false;
    public isEmsChecked: boolean = false;
    public isOtherChecked: boolean = false;
    public isOther2Checked: boolean = false;

    /** GET partition analyse */
    public filteredProvinces: Observable<string[]>;
    public filteredProvincesAddress: Observable<string[]>;
    public filteredProvincesAddressems: Observable<string[]>;
    public filteredProvincesAddresscustomer: Observable<string[]>;
    public filteredDistricts: Observable<string[]>;
    public filteredSubDistricts: Observable<string[]>;
    public filteredCustomers: Observable<any[]>;
    public filteredCustomerNo: Observable<any[]>;
    public filteredVehicles: Observable<any[]>;
    public filteredInsuranceTypes: Observable<any[]>;
    // public filteredBrands: Observable<any[]>;

    /** Utility declare */
    public licenseNumber: string = '';
    public licenseLetters: string = '';
    public isNumberValid: boolean = false;
    public selectedTax: string;
    public customerss: any;
    public selectedFuelType: string | null = null;
    public me: any | null;
    public services = [];
    public name_th: string;
    public id: string;
    public itemData: any = [];
    public PRBcheckboxTouched: boolean = false;

    public billId: number;
    public billStatus: string;

    public flashErrorMessage: string;
    public products$: Observable<any>;
    public asset_types: AssetType[];
    public flashMessage: 'success' | 'error' | null = null;
    public customErrorMessage: string | null = null;
    public isLoading: boolean = false;
    public env_path = environment.API_URL;
    public selectedFiles: File[] = [];
    public reduceScreen: boolean = false;

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    customerTypes = [
        { label: 'บุคคล', value: 'personal' },
        { label: 'บริษัท', value: 'vendor' },
        { label: 'ตัวแทน', value: 'agent' },
    ];

    // #endregion COLLAPSEPOINT

    // #region constructor
    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseConfirm: FuseConfirmationService,
        private _formBuilder: FormBuilder,
        private _Service: Service,
        private _matDialog: MatDialog,
        private _router: Router,
        private _activatedRoute: ActivatedRoute,
        private _formDataFrame: FormDataFrame,
        private _formDataService: FormDataService,
        private _US: UtilityService,
        private _decimalPipe: DecimalPipe
    ) {
        /**
         *
         * @formgroup สร้าง formgroup ผ่านฟังก์ชันเพื่อลดการใช้พื้นที่บนสคริปต์หลัก
         */
        this.formData = this._formDataFrame.createMainForm();
        this._formDataService.setFormGroup('formData', this.formData);

        this.formData_address = this._formDataFrame.createAddressForm();
        this._formDataService.setFormGroup(
            'formData_address',
            this.formData_address
        );

        this.formData_Customer = this._formDataFrame.createCustomerForm();
        this._formDataService.setFormGroup(
            'formData_Customer',
            this.formData_Customer
        );

        this.formData_ActPeriod = this._formDataFrame.createActPeriodForm();
        this._formDataService.setFormGroup(
            'formData_ActPeriod',
            this.formData_ActPeriod
        );

        this.formData_InsurData = this._formDataFrame.createInsurDataForm();
        this._formDataService.setFormGroup(
            'formData_InsurData',
            this.formData_InsurData
        );

        this.formData_PaidData = this._formDataFrame.createInstallmentForm();
        this._formDataService.setFormGroup(
            'formData_PaidData',
            this.formData_PaidData
        );

        this.formData_WithholdingTax = this._formBuilder.group({
            prb: 1,
            checkbox_prb: false,
            insu: 1,
            checkbox_insu: false,
            tax: 3,
            checkbox_tax: false,
            gas: 1,
            checkbox_gas: false,
        });

        this.formData_addressems = this._formBuilder.group({
            ems_address: [''],
            zip_code: [''],
            subdistricts: [''],
            districts: [''],
            province: [''],
            ems_subdistrict_id: [''],
            ems_district_id: [''],
            ems_province_id: [''],
            ems_name: '',
            photo: '',
        });
        this.formData_addresscustomer = this._formBuilder.group({
            address: ['', Validators.required],
            zip_code: [''],
            subdistricts: [''],
            districts: [''],
            province: [''],
            subdistrict_id: ['', Validators.required],
            district_id: ['', Validators.required],
            province_id: ['', Validators.required],
            customer_id: ['', Validators.required],
            is_main: [false],
        });

        /**
         *
         * @formgroup คัดลอกจาก customer_car
         * @function addGroup สร้าง array ล่วงหน้า
         */
        this.formData_CusCar = this._formDataFrame.createCusCarForm();
        this._formDataService.setFormGroup(
            'formData_CusCar',
            this.formData_CusCar
        );

        this.formGas_Edit = this._formDataFrame.createGasEditForm();
        this._formDataService.setFormGroup('formGas_Edit', this.formGas_Edit);

        this.formGas_Add = this._formDataFrame.createGasAddForm();
        this._formDataService.setFormGroup('formGas_Add', this.formGas_Add);

        this.addGroup();

        /**
         *
         * @formgroup คัดลอกจาก customer_data
         */
        this.formData_CusData = this._formDataFrame.createCusDataForm();
        this._formDataService.setFormGroup(
            'formData_CusData',
            this.formData_CusData
        );

        this.formAddress_CusData =
            this._formDataFrame.createCusDataAddressForm();
        this._formDataService.setFormGroup(
            'formAddress_CusData',
            this.formAddress_CusData
        );

        /**
         *
         * @formgroup คัดลอกจาก carcheck
         */
        this.formData_CarCheck = this._formDataFrame.createCarCheckForm();
        this._formDataService.setFormGroup(
            'formData_CarCheck',
            this.formData_CarCheck
        );

        /**
         *
         * @any พื้นที่ประกาศความสำคัญสูง
         */
        this.checkScreenSize();
    }

    // #endregion
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // #region Lifecycle Hooks

    @HostListener('window:resize', ['$event']) onResize(event: Event) {
        this.checkScreenSize();
    }
    // private checkScreenSize() { this.reduceScreen = window.innerWidth < 1280; }
    private checkScreenSize() {
        this.reduceScreen = true;
    }

    async ngOnInit(): Promise<void> {
        /** DATA/Service fetching */
        // ประกาศ pre-load ข้อมูลใด ๆ ที่ใช้ในหน้าหลัก

        /**
         *
         * @snapshot รับพารามิเตอร์ที่แนบมากับลิงค์
         */
        const id = this._activatedRoute.snapshot.queryParams['id'];
        this.billStatus =
            this._activatedRoute.snapshot.queryParams['billStatus'];


        /**
         *
         * @function โหลดข้อมูลล่วงหน้าสำหรับพรีวิวใน dropdown-select
         */
        this._Service.getEmployee().subscribe((resp) => {
            this.listEmployee = resp;
        });
        this._Service.getBrache().subscribe((resp) => {
            this.listBranch = resp;
        });
        this._Service.getInspection().subscribe((resp) => {
            this.listVehicleInspection = resp;
        });
        this._Service.getInsurance().subscribe((resp) => {
            this.listInsuranceTypes = resp;
        });
        this._Service.getCustomer().subscribe((resp) => {
            this.listcustomer = resp;
        });
        // this._Service.getCustomerNo().subscribe((resp) => { this.listcustomerNo = resp; });
        this._Service.getInsurName().subscribe((resp) => {
            this.listInsuranceName = resp.data;
        });
        this._Service.getInsurRenewType().subscribe((resp) => {
            this.listInsurRenewType = resp;
        });
        this._Service.getGasBrands().subscribe((resp) => {
            this.listGasBrands = resp;
        });
        /** main valueChange declare */
        // ประกาศการจับ valueChange ของตัวแปรใด ๆ ที่ใช้ในหน้าหลัก
        {
            this.formData
                .get('vehicle_inspection_types_id')
                .valueChanges.subscribe((inspectionId) => {
                    this._onSelectInspection(inspectionId);
                });
            this.formData_CusCar
                .get('vehicle_inspection_types_id')
                .valueChanges.subscribe((inspectionId) => {
                    this._onSelectInspection(inspectionId);
                });
            this.filteredCustomers = this.formData.get('name')?.valueChanges.pipe(
                startWith(''),
                startWith(''),
                map((value) =>
                    this._filterListN(this.listcustomer, value, 'name')
                )
            );
            this.filteredCustomerNo = this.formData
                .get('no_cache')
                ?.valueChanges.pipe(
                    startWith(''),
                    startWith(''),
                    map((value) =>
                        this._filterListN(this.listcustomerNo, value, 'no')
                    )
                );
            this._setupVehicleNumberAutocomplete();
            this._Service.getVehicle().subscribe({
                next: (resp) => {
                    this.listVehicles = this._normalizeVehicleList(resp);
                    this._changeDetectorRef.markForCheck();
                },
                error: (err) => {
                    console.error('โหลดรายการทะเบียนไม่สำเร็จ', err);
                    this.listVehicles = [];
                    this._US.showFlashMessage(
                        'error',
                        this._changeDetectorRef,
                        this
                    );
                },
            });

            this.formData.get('licenseLetters')?.enable({ emitEvent: false });
            this.formData
                .get('licenseNumber')
                ?.valueChanges.subscribe((value) => {
                    const v = (value ?? '').toString().trim();
                    this.isNumberValid = v.length > 0 && !isNaN(Number(v));
                    this.combineLicensePlate();
                });
            this.formData.get('licenseLetters')?.valueChanges.subscribe(() => {
                this.combineLicensePlate();
            });

            if (!id) {
                this.loadservice();
            }

            this.formData
                .get('is_headquarter')
                ?.valueChanges.subscribe((value) => {
                    const newValue = value ? 1 : 0;
                    this.formData
                        .get('is_headquarter')
                        ?.setValue(newValue, { emitEvent: false });
                });

            this.formData_address
                .get('province')
                ?.valueChanges.pipe(
                    startWith(''),
                    tap(() => {
                        this.formData_address.patchValue({ province_id: null });
                    }),
                    switchMap((provinceName) => {
                        const selectedProvince = this.listProvinces.find(
                            (p) => p.name_th === provinceName
                        );
                        const provinceId = selectedProvince?.id || null;
                        this.formData_address.patchValue({
                            province_id: provinceId,
                        });
                        return of([]);
                    })
                )
                .subscribe();
        }

        /** autocomplete filter address */
        // valueChange ที่ใช้ใน'สร้างบิล > ที่อยู่'
        {
            this._Service.getProvinces().subscribe((resp) => {
                this.listProvinces = resp;
            });

            /** single Province field */
            {
                this.filteredProvinces = this.formData
                    .get('province')
                    ?.valueChanges.pipe(
                        startWith(''),
                        map((value) => this._filterProvinces(value))
                    );

                this.formData
                    .get('province')
                    ?.valueChanges.pipe(
                        startWith(''),
                        tap(() => {
                            if (this.formData.get('province_id')?.value) {
                                this.formData.patchValue({ province_id: null });
                            }
                        }),
                        switchMap((provinceName) => {
                            const selectedProvince = this.listProvinces.find(
                                (p) => p.name_th === provinceName
                            );
                            const provinceId = selectedProvince?.id || null;

                            if (
                                this.formData.get('province_id')?.value !==
                                provinceId
                            ) {
                                this.formData.patchValue({
                                    province_id: provinceId,
                                });
                            }
                            return of([]);
                        })
                    )
                    .subscribe();
            }

            /** address field */
            {
                this.filteredProvincesAddress = this.formData_address
                    .get('province')
                    ?.valueChanges.pipe(
                        startWith(''),
                        map((value) =>
                            this._filterList(
                                this.listProvinces,
                                value,
                                'name_th'
                            )
                        )
                    );

                this.formData_address
                    .get('province')
                    ?.valueChanges.pipe(
                        startWith(''),
                        tap(() => {
                            this.formData_address
                                .get('districts')
                                ?.setValue('');
                            this.formData_address
                                .get('subdistricts')
                                ?.setValue('');
                            this.formData_address
                                .get('province_id')
                                ?.setValue('');
                            this.listdistricts = [];
                            this.listSubDistricts = [];
                        }),
                        switchMap((provinceName) => {
                            const selectedProvince = this.listProvinces.find(
                                (p) => p.name_th === provinceName
                            );
                            const provinceId = selectedProvince?.id || null;

                            this.formData_address
                                .get('province_id')
                                ?.setValue(provinceId);
                            if (provinceId) {
                                return this._Service.getDistricts(provinceId);
                            } else {
                                return of([]);
                            }
                        })
                    )
                    .subscribe((resp) => {
                        this.listdistricts = resp.districts || [];
                        this.filteredDistricts = this.formData_address
                            .get('districts')
                            ?.valueChanges.pipe(
                                startWith(''),
                                map((value) =>
                                    this._filterList(
                                        this.listdistricts,
                                        value,
                                        'name_th'
                                    )
                                )
                            );
                    });

                this.formData_address
                    .get('districts')
                    ?.valueChanges.pipe(
                        startWith(''),
                        tap(() => {
                            this.formData_address
                                .get('subdistricts')
                                ?.setValue('');
                            this.formData_address
                                .get('district_id')
                                ?.setValue('');
                            this.listSubDistricts = [];
                        }),
                        switchMap((districtName) => {
                            const selectedDistrict = this.listdistricts.find(
                                (d) => d.name_th === districtName
                            );
                            const districtId = selectedDistrict?.id || null;

                            this.formData_address
                                .get('district_id')
                                ?.setValue(districtId);
                            if (districtId) {
                                return this._Service.getSubDistricts(
                                    districtId
                                );
                            } else {
                                return of([]);
                            }
                        })
                    )
                    .subscribe((resp) => {
                        this.listSubDistricts = resp.sub_districts || [];
                        this.filteredSubDistricts = this.formData_address
                            .get('subdistricts')
                            ?.valueChanges.pipe(
                                startWith(''),
                                map((value) =>
                                    this._filterList(
                                        this.listSubDistricts,
                                        value,
                                        'name_th'
                                    )
                                )
                            );
                    });

                this.formData_address
                    .get('subdistricts')
                    ?.valueChanges.pipe(
                        startWith(''),
                        map((subdistrictName) => {
                            const selectedSubDistrict =
                                this.listSubDistricts.find(
                                    (s) => s.name_th === subdistrictName
                                );
                            const subdistrictId =
                                selectedSubDistrict?.id || null;

                            this.formData_address
                                .get('subdistrict_id')
                                ?.setValue(subdistrictId);
                            if (selectedSubDistrict) {
                                this.formData_address
                                    .get('zip_code')
                                    ?.setValue(selectedSubDistrict.zip_code);
                            } else {
                                this.formData_address
                                    .get('zip_code')
                                    ?.setValue('');
                            }
                            return subdistrictName;
                        })
                    )
                    .subscribe();
            }
            /** address ems field */
            {
                this.filteredProvincesAddressems = this.formData_addressems
                    .get('province')
                    ?.valueChanges.pipe(
                        startWith(''),
                        map((value) =>
                            this._filterList(
                                this.listProvinces,
                                value,
                                'name_th'
                            )
                        )
                    );

                this.formData_addressems
                    .get('province')
                    ?.valueChanges.pipe(
                        startWith(''),
                        tap(() => {
                            this.formData_addressems
                                .get('districts')
                                ?.setValue('');
                            this.formData_addressems
                                .get('subdistricts')
                                ?.setValue('');
                            this.formData_addressems
                                .get('ems_province_id')
                                ?.setValue('');
                            this.listdistricts = [];
                            this.listSubDistricts = [];
                        }),
                        switchMap((provinceName) => {
                            const selectedProvince = this.listProvinces.find(
                                (p) => p.name_th === provinceName
                            );
                            const provinceId = selectedProvince?.id || null;

                            this.formData_addressems
                                .get('ems_province_id')
                                ?.setValue(provinceId);
                            if (provinceId) {
                                return this._Service.getDistricts(provinceId);
                            } else {
                                return of([]);
                            }
                        })
                    )
                    .subscribe((resp) => {
                        this.listdistricts = resp.districts || [];
                        this.filteredDistricts = this.formData_addressems
                            .get('districts')
                            ?.valueChanges.pipe(
                                startWith(''),
                                map((value) =>
                                    this._filterList(
                                        this.listdistricts,
                                        value,
                                        'name_th'
                                    )
                                )
                            );
                    });

                this.formData_addressems
                    .get('districts')
                    ?.valueChanges.pipe(
                        startWith(''),
                        tap(() => {
                            this.formData_addressems
                                .get('subdistricts')
                                ?.setValue('');
                            this.formData_addressems
                                .get('ems_district_id')
                                ?.setValue('');
                            this.listSubDistricts = [];
                        }),
                        switchMap((districtName) => {
                            const selectedDistrict = this.listdistricts.find(
                                (d) => d.name_th === districtName
                            );
                            const districtId = selectedDistrict?.id || null;

                            this.formData_addressems
                                .get('ems_district_id')
                                ?.setValue(districtId);
                            if (districtId) {
                                return this._Service.getSubDistricts(
                                    districtId
                                );
                            } else {
                                return of([]);
                            }
                        })
                    )
                    .subscribe((resp) => {
                        this.listSubDistricts = resp.sub_districts || [];
                        this.filteredSubDistricts = this.formData_addressems
                            .get('subdistricts')
                            ?.valueChanges.pipe(
                                startWith(''),
                                map((value) =>
                                    this._filterList(
                                        this.listSubDistricts,
                                        value,
                                        'name_th'
                                    )
                                )
                            );
                    });

                this.formData_addressems
                    .get('subdistricts')
                    ?.valueChanges.pipe(
                        startWith(''),
                        map((subdistrictName) => {
                            const selectedSubDistrict =
                                this.listSubDistricts.find(
                                    (s) => s.name_th === subdistrictName
                                );
                            const subdistrictId =
                                selectedSubDistrict?.id || null;

                            this.formData_addressems
                                .get('ems_subdistrict_id')
                                ?.setValue(subdistrictId);
                            if (selectedSubDistrict) {
                                this.formData_addressems
                                    .get('zip_code')
                                    ?.setValue(selectedSubDistrict.zip_code);
                            } else {
                                this.formData_addressems
                                    .get('zip_code')
                                    ?.setValue('');
                            }
                            return subdistrictName;
                        })
                    )
                    .subscribe();
            }
            /** address customer field */
            {
                this.filteredProvincesAddresscustomer =
                    this.formData_addresscustomer
                        .get('province')
                        ?.valueChanges.pipe(
                            startWith(''),
                            map((value) =>
                                this._filterList(
                                    this.listProvinces,
                                    value,
                                    'name_th'
                                )
                            )
                        );

                this.formData_addresscustomer
                    .get('province')
                    ?.valueChanges.pipe(
                        startWith(''),
                        tap(() => {
                            this.formData_addresscustomer
                                .get('districts')
                                ?.setValue('');
                            this.formData_addresscustomer
                                .get('subdistricts')
                                ?.setValue('');
                            this.formData_addresscustomer
                                .get('province_id')
                                ?.setValue('');
                            this.listdistricts = [];
                            this.listSubDistricts = [];
                        }),
                        switchMap((provinceName) => {
                            const selectedProvince = this.listProvinces.find(
                                (p) => p.name_th === provinceName
                            );
                            const provinceId = selectedProvince?.id || null;

                            this.formData_addresscustomer
                                .get('province_id')
                                ?.setValue(provinceId);
                            if (provinceId) {
                                return this._Service.getDistricts(provinceId);
                            } else {
                                return of([]);
                            }
                        })
                    )
                    .subscribe((resp) => {
                        this.listdistricts = resp.districts || [];
                        this.filteredDistricts = this.formData_addresscustomer
                            .get('districts')
                            ?.valueChanges.pipe(
                                startWith(''),
                                map((value) =>
                                    this._filterList(
                                        this.listdistricts,
                                        value,
                                        'name_th'
                                    )
                                )
                            );
                    });

                this.formData_addresscustomer
                    .get('districts')
                    ?.valueChanges.pipe(
                        startWith(''),
                        tap(() => {
                            this.formData_addresscustomer
                                .get('subdistricts')
                                ?.setValue('');
                            this.formData_addresscustomer
                                .get('district_id')
                                ?.setValue('');
                            this.listSubDistricts = [];
                        }),
                        switchMap((districtName) => {
                            const selectedDistrict = this.listdistricts.find(
                                (d) => d.name_th === districtName
                            );
                            const districtId = selectedDistrict?.id || null;

                            this.formData_addresscustomer
                                .get('district_id')
                                ?.setValue(districtId);
                            if (districtId) {
                                return this._Service.getSubDistricts(
                                    districtId
                                );
                            } else {
                                return of([]);
                            }
                        })
                    )
                    .subscribe((resp) => {
                        this.listSubDistricts = resp.sub_districts || [];
                        this.filteredSubDistricts =
                            this.formData_addresscustomer
                                .get('subdistricts')
                                ?.valueChanges.pipe(
                                    startWith(''),
                                    map((value) =>
                                        this._filterList(
                                            this.listSubDistricts,
                                            value,
                                            'name_th'
                                        )
                                    )
                                );
                    });

                this.formData_addresscustomer
                    .get('subdistricts')
                    ?.valueChanges.pipe(
                        startWith(''),
                        map((subdistrictName) => {
                            const selectedSubDistrict =
                                this.listSubDistricts.find(
                                    (s) => s.name_th === subdistrictName
                                );
                            const subdistrictId =
                                selectedSubDistrict?.id || null;

                            this.formData_addresscustomer
                                .get('subdistrict_id')
                                ?.setValue(subdistrictId);
                            if (selectedSubDistrict) {
                                this.formData_addresscustomer
                                    .get('zip_code')
                                    ?.setValue(selectedSubDistrict.zip_code);
                            } else {
                                this.formData_addresscustomer
                                    .get('zip_code')
                                    ?.setValue('');
                            }
                            return subdistrictName;
                        })
                    )
                    .subscribe();
            }
        }

        /** utility valueChange declare */
        // ประกาศ valueChange เพิ่มเติม
        {
            const subscribeToFormChanges = (controlName: string) => {
                this.formData
                    .get(controlName)
                    .valueChanges.pipe(
                        debounceTime(300),
                        distinctUntilChanged()
                    )
                    .subscribe((value) => {
                        if (value) {
                            const vehicle_inspection_types_id =
                                this.formData.get(
                                    'vehicle_inspection_types_id'
                                ).value;
                            if (vehicle_inspection_types_id) {
                                this.onVehicleTypeChange(
                                    vehicle_inspection_types_id
                                );
                            }
                        }
                    });
            };

            // Subscribe to form changes for each control
            /**
             *
             * @function Subscribe valueChange ให้กับตัวแปรใน formData ที่จะสร้างผลกระทบต่อ'calGas/calTax'
             */
            subscribeToFormChanges('weight');
            subscribeToFormChanges('cc');
            subscribeToFormChanges('fuel_type');
            subscribeToFormChanges('is_corporate');
            subscribeToFormChanges('tax_due_date');
            subscribeToFormChanges('tax_renewal_date');

            this.formData
                .get('regeister_date')
                .valueChanges.subscribe((registerDate) => {
                    if (registerDate) {
                        const currentYear = new Date().getFullYear(); // ปีปัจจุบัน
                        const registerDateObj = new Date(registerDate); // แปลงวันที่จดทะเบียนให้เป็น Date object

                        let taxDueDate = new Date(
                            currentYear,
                            registerDateObj.getMonth(),
                            registerDateObj.getDate(),
                            12,
                            0,
                            0
                        );
                        if (
                            taxDueDate.getDate() !== registerDateObj.getDate()
                        ) {
                            taxDueDate.setDate(registerDateObj.getDate()); // ให้วันที่ครบภาษีตรงกับวันที่จดทะเบียน
                        }
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        // ถ้า tax_due_date อยู่ในอดีต ให้เพิ่มไปอีกหนึ่งปี
                        if (taxDueDate < today) {
                            taxDueDate.setFullYear(
                                taxDueDate.getFullYear() + 1
                            );
                        }

                        this.formData.patchValue({
                            tax_due_date: taxDueDate
                                .toISOString()
                                .split('T')[0],
                        });
                    }
                });

            const userData = localStorage.getItem('user');
            if (userData) {
                const userObject = JSON.parse(userData);
                const userId = userObject.id;
                this.formData.patchValue({
                    employee_id: userObject.employees_id ?? 1,
                });
            }
        }

        /** dialog valueChange declare */
        {
            // PaidType
            // this.formData.get('discount').valueChanges.subscribe(() => {
            //     const discount = parseFloat(this.formData.get('discount').value) || 0;
            //     const total = parseFloat(this.formData.get(this.paidState()).value) || 0;
            //     if (discount > total) { this.formData.patchValue({ discount: total }) }

            //     const lastprice = total - discount;
            //     const rounded = parseFloat(lastprice.toFixed(2));
            //     this.formData.patchValue({ last_price: rounded });
            // });
            // this.formData.get('now_paid').valueChanges.subscribe(() => {
            //     const nowPaid = parseFloat(this.formData.get('now_paid').value) || 0;
            //     const lastPrice = parseFloat(this.formData.get('last_price').value) || 0;
            //     if (nowPaid > lastPrice) {
            //         const changeprice = nowPaid - lastPrice;
            //         const rounded = parseFloat(changeprice.toFixed(2));
            //         this.formData.patchValue({ change_price: rounded });
            //     } else { this.formData.patchValue({ change_price: 0.00 }) }
            // });

            // ActPeriod
            this.formData_ActPeriod
                .get('date_end_prb')
                .valueChanges.subscribe(() => {
                    if (this.isAdjustingValue) return;

                    const startDate =
                        this.formData_ActPeriod.get('date_start_prb').value;
                    const endDate =
                        this.formData_ActPeriod.get('date_end_prb').value;

                    if (
                        startDate &&
                        endDate &&
                        startDate.length >= 10 &&
                        endDate.length >= 10
                    ) {
                        const daysDifference = this.getDaysDifference(
                            new Date(startDate),
                            new Date(endDate)
                        );

                        this.formData_ActPeriod
                            .get('periodrange')
                            .patchValue(daysDifference);
                    }
                });
            this.formData_ActPeriod
                .get('periodrange')
                .valueChanges.subscribe(() => {
                    if (this.isAdjustingValue) return;

                    if (
                        this.formData_ActPeriod.get('date_start_prb').value ==
                        ''
                    ) {
                        this.getNowDate();
                    }
                    this.adjustValue(0);
                });
            this.totalDayInYear.valueChanges.subscribe((value) => {
                this.adjustValue(0);
            });

            // this.openActPeriod(true);
        }

        /** subject declare */
        {
            /**
             *
             * @function การประกาศ subject สำหรับการหน่วงเวลาตัวแปรที่เกี่ยวข้องกับ API โดยตรง (carCheck/calGas/calTax)
             */
            this.carCheckSubject
                .pipe(
                    debounceTime(300),
                    switchMap((requestData) =>
                        this._Service.cal_checkcar(requestData)
                    )
                )
                .subscribe({
                    next: (resp) => {
                        this.servicesFormArray
                            .at(0)
                            .get('service_price')
                            .setValue(resp.data.price);
                    },
                    error: (error) => {
                        console.error('Error calculating car check:', error);
                    },
                });

            this.calTaxSubject
                .pipe(
                    debounceTime(300),
                    switchMap((requestData) =>
                        this._Service.cal_tax(requestData)
                    )
                )
                .subscribe({
                    next: (resp) => {
                        this.dataRow2 = resp.data;
                        this.calLackofTax(this.lackofTaxCheck);
                    },
                    error: (error) => {
                        console.error('Error calculating tax:', error);
                    },
                });

            // Subscribe to calGasSubject with debounce time
            this.calGasSubject
                .pipe(
                    debounceTime(300),
                    switchMap((requestData) =>
                        this._Service.cal_gas(requestData)
                    )
                )
                .subscribe({
                    next: (resp) => {
                        this.servicesFormArray
                            .at(7)
                            .get('service_price')
                            .setValue(resp.data.service_8);
                        this.servicesFormArray
                            .at(8)
                            .get('service_price')
                            .setValue(resp.data.service_9);
                        this.servicesFormArray
                            .at(10)
                            .get('service_price')
                            .setValue(resp.data.service_11);
                        this.servicesFormArray
                            .at(11)
                            .get('service_price')
                            .setValue(resp.data.service_12);
                    },
                    error: (error) => {
                        console.error('Error calculating gas:', error);
                    },
                });

            this.calTaxserviceSubject
                .pipe(
                    debounceTime(300),
                    switchMap((requestData2) =>
                        this._Service.cal_setting(requestData2)
                    )
                )
                .subscribe({
                    next: (resp) => {
                        this.servicesFormArray
                            .at(4)
                            .get('service_price')
                            .setValue(resp.data.price);
                    },
                    error: (error) => {
                        console.error('Error calculating taxservice:', error);
                    },
                });
        }

        /** CusCar */
        {
            this._Service.getProvinces().subscribe((resp) => {
                this.listProvinces_CusCar = resp;
            });
            this._Service.getInspection().subscribe((resp) => {
                this.listInspection_CusCar = resp;
            });
            this._Service.getInsurance().subscribe((resp) => {
                this.listInsurance_CusCar = resp;
            });
            this._Service.getBrand().subscribe((resp) => {
                this.listBrands_CusCar = resp;
            });
        }

        this.onCustomerTypeChange(
            this.formData.get('type')?.value || 'personal'
        );

        if (id) {
            this.loadBillData(id);
        }

    }
    ngAfterViewInit(): void { }
    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    get servicesFormArray(): FormArray {
        return this.formData.get('List_service_tran') as FormArray;
    }

    // #endregion
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // #region OnInit support

    /**
     *
     * @function การเรียก'ค่าบริการ'เมื่อเริ่มต้น
     */
    loadservice() {
        this._Service.getServices().subscribe((resp) => {
            const services = resp;
            const serviceFormArray = this.formData.get(
                'List_service_tran'
            ) as FormArray;
            // กัน race กับ loadBillData: callback ช้ากว่า clear+โหลดบิลจะไม่ push ซ้ำ
            if (serviceFormArray.length > 0) {
                return;
            }
            services.forEach((service, index) => {
                const serviceGroup = this.createServiceGroup(service);
                serviceGroup
                    .get('service_price')
                    ?.valueChanges.subscribe(() => {
                        this.sumTotal();
                    });
                serviceGroup.get('status')?.valueChanges.subscribe(() => {
                    this.sumTotal();
                });
                serviceFormArray.push(serviceGroup);

                if (index === 1) {
                    this.formData
                        .get('prb_service_cache')
                        .patchValue(service.price);
                }
            });

            this.sumTotal();
            this._changeDetectorRef.detectChanges();
        });
    }
    /**
     *
     * @function ส่วนสนับสนุนการเรียก'ค่าบริการ'ของ'loadservice()'
     * @param service API data จาก'โครงสร้างข้อมูล > ข้อมูล พ.ร.บ. > ตั้งค่าบริการ'
     * @returns array ของ'ตั้งค่าบริการ'
     */
    private createServiceGroup(service: any): FormGroup {
        const group = this._formBuilder.group({
            service_id: [service.id],
            service_name: [service.name],
            withholding_tax_percent: '',
            is_vat: [service.is_vat],
            status: [0],
            service_price: [{ value: service.price, disabled: true }],
        });
        this.sumTotal();
        this._changeDetectorRef.detectChanges();

        group.get('is_vat').valueChanges.subscribe((value: boolean) => {
            this.sumTotal();
        });

        group.get('status').valueChanges.subscribe((checked) => {
            const servicePriceControl = group.get('service_price');
            if (checked) {
                servicePriceControl.enable();
                group.get('status').setValue(1, { emitEvent: false });
                this._changeDetectorRef.detectChanges();
            } else {
                servicePriceControl.disable();
                group.get('status').setValue(0, { emitEvent: false });
            }
            this._changeDetectorRef.detectChanges();
        });

        return group;
    }

    /**
     *
     * @function ฟังก์ชันสำหรับเชื่อมตัวอักษรกับเลขทะเบียนสำหรับการ patch
     */
    combineLicensePlate(): void {
        const letters = (this.formData.get('licenseLetters')?.value ?? '')
            .toString()
            .trim();
        const number = (this.formData.get('licenseNumber')?.value ?? '')
            .toString()
            .trim();
        if (!letters || !number) {
            return;
        }
        const licensePlate = `${letters}-${number}`;
        this.formData.patchValue({ license_plate: licensePlate }, { emitEvent: false });
        this._changeDetectorRef.detectChanges();
    }

    /**
     *
     * @param inspectionId รับ ID ของประเภทรถ เพื่อกรองรายการประเภท พ.ร.บ.
     */
    private _onSelectInspection(inspectionId: number): void {
        this.filteredInsuranceTypes = this.listInsuranceTypes.filter(
            (insurance) =>
                insurance.vehicle_inspection_types_id === inspectionId
        );
    }
    /**
     *
     * @param value ค่าตัวเลขสำหรับ filter เลขทะเบียน (เช่น value = 12 จะค้นหาทะเบียนที่มี 12 เป็นส่วนประกอบ)
     * @returns ผลลัพธ์ที่ผ่านการ filter แล้วเป็น array
     */
    private _normalizeVehicleList(resp: any): any[] {
        const rows = Array.isArray(resp)
            ? resp
            : Array.isArray(resp?.data)
              ? resp.data
              : [];
        return rows
            .filter((v) => (v?.license_plate ?? '').toString().trim())
            .sort((a, b) =>
                (a.license_plate ?? '').localeCompare(b.license_plate ?? '', 'th')
            );
    }

    /** autocomplete ทะเบียน — พิมพ์ที่ช่องเลข แล้วเลือกจากรายการ (แบบเดิม) */
    private _setupVehicleNumberAutocomplete(): void {
        const numberCtrl = this.formData.get('licenseNumber');
        if (!numberCtrl) {
            return;
        }
        this.filteredVehicles = numberCtrl.valueChanges.pipe(
            startWith(numberCtrl.value ?? ''),
            map((value) => this._filterVehiclesByNumber(value))
        );
    }

    vehicleLicenseNumberPart(vehicle: { license_plate?: string }): string {
        return this._splitLicensePlate(vehicle?.license_plate ?? '').number;
    }

    private _filterVehiclesByNumber(value: string): any[] {
        const filterValue = (value ?? '').toString().trim().toLowerCase();
        if (!filterValue) {
            return [];
        }
        return this.listVehicles.filter((vehicle) => {
            const parts = this._splitLicensePlate(vehicle.license_plate ?? '');
            return (
                parts.number &&
                parts.number.toLowerCase().startsWith(filterValue)
            );
        });
    }

    private _splitLicensePlate(plate: string): { letters: string; number: string } {
        const raw = (plate ?? '').toString().trim();
        const dash = raw.indexOf('-');
        if (dash < 0) {
            return { letters: '', number: raw };
        }
        return {
            letters: raw.slice(0, dash).trim(),
            number: raw.slice(dash + 1).trim(),
        };
    }

    /**
     *
     * @param list array ที่รับชุดข้อมูลจาก API (ข้างในเป็น object)
     * @param value ทำงานเหมือนฟังก์ชันก่อนหน้าคือใช้สำหรับ filter แต่ไม่ได้จำกัดเฉพาะตัวเลข
     * @param key เนื่องจากเป็นฟังก์ชัน dynamic จึงต้องระบุว่าจะใช้การกรองกับ'ค่า'ใดจาก list
     * @returns ผลลัพธ์ที่ผ่านการ filter แล้วเป็น array
     */
    private _filterListN(list: any, value: string, key: string): any[] {
        if (!list || !Array.isArray(list.data)) {
            return [];
        }
        const term = (value ?? '').toString().toLowerCase().trim();
        if (!term) {
            return [];
        }
        return list.data.filter((item) =>
            (item[key] ?? '').toString().toLowerCase().includes(term)
        );
    }
    /**
     *
     * @function ต่างกันคืออันข้างบน return ชุด array ที่มีข้อมูลเป็นคู่ [{license_plate: 'ABC-1234'}, {license_plate: 'GHI-1239'}] ได้
     *  ในขณะที่ฟังก์ชันนี้ return เฉพาะข้อมูลตัวที่ถูกกรอง [1112, 1211, 1200, 9712]
     * @param list เหมือนฟังก์ชันก่อนหน้า
     * @param value เหมือนฟังก์ชันก่อนหน้า
     * @param key เหมือนฟังก์ชันก่อนหน้า
     * @returns เหมือนฟังก์ชันก่อนหน้า
     */
    private _filterList(list: any[], value: string, key: string): any[] {
        const filterValue = value.toLowerCase();
        return list.filter((item) =>
            item[key].toLowerCase().includes(filterValue)
        );
    }
    /**
     *
     * @param value เหมือนฟังก์ชันก่อนหน้า
     * @returns ฟิลด์'ข้อมูลรถ'ในหน้าสร้างบิลมี slot จังหวัดที่เก็บแยกจากที่อยู่ลูกค้า function นี้ใช้สำหรับ slot นั้น ข้อมูลที่ return เหมือนฟังก์ชันก่อนหน้า
     */
    private _filterProvinces(value: string): any[] {
        const filterValue = value.toLowerCase();
        return this.listProvinces.filter((item) =>
            item.name_th.toLowerCase().includes(filterValue)
        );
    }

    // #endregion
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // #region Load & Patch function

    /**
     *
     * @param id รับ id จาก activatedRoute.snapshot ตอน onInit (ถ้ามี) แล้ว API รับข้อมูลพาหนะมา patch**
     */
    loadBillData(id: any): void {

        this._Service.getBillById(id).subscribe((response) => {
            const billData = response.data;
            this.billId = billData.id;
            this.cusCarGasCache = billData.inspection_vehicles[0].vehicle || null;

            this._Service.getProvinces().subscribe((resp) => {
                this.listProvinces = resp;
                const selectedProvince = this.listProvinces.find(
                    (province) =>
                        province.id ===
                        billData.inspection_vehicles[0].vehicle.province_id
                );
                const provinceName = selectedProvince
                    ? selectedProvince.name_th
                    : null;
                const [licenseLetters, licenseNumber] =
                    billData.inspection_vehicles[0].license_plate.split('-');

                const {
                    id,
                    appointment,
                    status,
                    employee_id,
                    branch_id,
                    date,
                    result,
                    total,
                    discount,
                    type_document,
                    no,
                    total_vat,
                    total_nonvat,
                    discount_before_vat,
                    discount_after_vat,
                    total_vatcal,
                    total_nonvatcal,
                    remark,
                    remark_transport,
                } = billData;
                const {
                    registration_date: regeister_date,
                    cc,
                    weight,
                    notificate_tax: tax_due_date,
                    tax_renewal_date,
                    fuel_type,
                    license_plate,
                } = billData.inspection_vehicles[0].vehicle || {};
                const {
                    name,
                    lname,
                    phone_number1,
                    phone_number2,
                    tax_id,
                    type,
                    is_headquarter,
                } = billData.customers || {};

                let customerName = name;
                let customerType = type;
                if (billData.customers) {
                    customerType = type || billData.customers.type || 'personal';
                    this.onCustomerTypeChange(customerType);
                    customerName = name ?? billData.customers.name ?? '';
                    this.customerID = billData.customers.id;
                }

                this.formData.patchValue({
                    id,
                    appointment,
                    status,
                    employee_id,
                    branch_id,
                    date,
                    result,
                    total,
                    discount,
                    type_document: billData.inspection_vehicles[0].type_document,
                    no,
                    total_vat,
                    total_nonvat,
                    discount_before_vat,
                    discount_after_vat,
                    total_vatcal,
                    total_nonvatcal,
                    remark: remark ?? '',
                    remark_transport: remark_transport ?? '',
                    regeister_date,
                    cc,
                    weight,
                    tax_due_date: billData.inspection_vehicles[0].vehicle.notificate_tax,
                    tax_renewal_date,
                    fuel_type,
                    license_plate,
                    licenseLetters,
                    licenseNumber,
                    province: provinceName,
                    vehicle_inspection_types_id: +billData.inspection_vehicles[0].vehicle.vehicle_inspection_types_id,
                    insurance_types_id: +billData.inspection_vehicles[0].vehicle.insurance_types_id,
                    customer_id: +billData.customer_id,
                    ...(billData.customers
                        ? {
                            name: customerName,
                            lname,
                            phone_number1,
                            phone_number2,
                            tax_id,
                            type: customerType,
                            is_headquarter,
                        }
                        : {}),
                });
                this.formData.get('licenseLetters')?.enable({ emitEvent: false });
            });


            if (billData.customers) {
                this.formData_address.patchValue({
                    address: billData.customers?.customer__addresses[0]?.address,
                });
            }
            this.servicesFormArray.clear();
            this._Service.getServices().subscribe((resp) => {
                const services = resp;
                const serviceFormArray = this.formData.get('List_service_tran') as FormArray;
                serviceFormArray.clear();

                services.forEach((service, index) => {
                    const serviceGroup = this.createServiceGroup(service);


                    serviceFormArray.push(serviceGroup);

                    if (index === 1) {
                        this.formData.get('prb_service_cache')?.patchValue(service.price);
                    }


                });

                // Patch ค่าจาก billData ถ้ามี
                const transactions = billData?.inspection_vehicles?.[0]?.vehicle_service_transaction || [];
                this.isAutoPatch = true;

                transactions.forEach((tran) => {
                    const matchingIndex = serviceFormArray.controls.findIndex(
                        (ctrl: AbstractControl) => Number(ctrl.get('service_id')?.value) === Number(tran.service_id)
                    );

                    if (tran.service_id === 2) {
                        const amount = billData.insurance_data?.prb?.amount_paid + billData.insurance_data?.prb?.tax + billData.insurance_data?.prb?.stamp
                        this.formData.patchValue({
                            date_start_prb: billData.insurance_data?.prb?.date_start,
                            date_end_prb: billData.insurance_data?.prb?.date_end,
                            insurance_names_id_prb: billData.insurance_data?.prb?.insurance_names_id,
                            amount_paid_prb: amount
                        })
                    }

                    if (tran.service_id === 7) {
                        const amount = billData.insurance_data?.insurance?.amount_paid
                        this.formData.patchValue({
                            date_start: billData.insurance_data?.insurance?.date_start,
                            date_end: billData.insurance_data?.insurance?.date_end,
                            insurance_names_id: billData.insurance_data?.insurance?.insurance_names_id,
                            insurance_renewal_type_id: billData.insurance_data?.insurance?.insurance_names_id,
                            amount_paid: amount
                        })
                    }

                    if (matchingIndex !== -1) {
                        const group = serviceFormArray.at(matchingIndex) as FormGroup;

                        group.patchValue({
                            service_price: tran.service_price,
                            status: true
                        });

                        // เรียกเพื่อทำงาน logic ที่เกี่ยวข้อง แต่ไม่เด้ง dialog เพราะ isAutoPatch = true
                        this.onCheckboxChange(group, matchingIndex);
                    } else {
                        console.warn(`ไม่พบ service_id ${tran.service_id} ใน servicesFormArray`);
                    }
                });
                // ต้องเรียกฟังก์ชันหลัง patch
                this.updateServiceStatusFlags();
                this.isAutoPatch = false;
                this.syncRemarkFieldVisibility(billData);
                this.formData.patchValue({
                    remark: billData.remark ?? '',
                    remark_transport: billData.remark_transport ?? '',
                });
                this.sumTotal();
                this._changeDetectorRef.detectChanges();
            });

            this.formData_CusCar.patchValue({
                ...billData.inspection_vehicles[0].vehicle,

            })

            this.formData_CusData.patchValue({
                ...billData.customers,
            });

            this.formData_CarCheck.patchValue({
                is_pass: billData.is_pass,
                result: billData.result,
            })
            const addressArray = this.formData_CusData.get(
                'address_arr'
            ) as FormArray;
            addressArray.clear();
            if (billData.customers.customer__addresses.length > 0) {
                billData.customers.customer__addresses.forEach(
                    (address: any) => {
                        addressArray.push(
                            this._formBuilder.group({
                                id: address.id,
                                address: address.address,
                                zip_code: address.zip_code,
                                is_main: address.is_main,
                                province_name:
                                    address.provinces?.name_th,
                                district_name:
                                    address.districts?.name_th,
                                subdistrict_name:
                                    address.sub_districts
                                        ?.name_th,
                                province_id:
                                    address.province_id,
                                district_id:
                                    address.district_id,
                                subdistrict_id:
                                    address.subdistrict_id,
                            })
                        );
                    }
                );
            }
        });
    }

    updateServiceStatusFlags(): void {
        const formArray = this.formData.get('List_service_tran') as FormArray;

        this.isTaxChecked = [3, 4, 5].some(i => formArray.at(i)?.get('status')?.value === 1);
        this.isLPGChecked = [8, 9].some(i => formArray.at(i)?.get('status')?.value === 1);
        this.isNGVChecked = formArray.at(10)?.get('status')?.value === 1;
        this.isActChecked = formArray.at(1)?.get('status')?.value === 1;
        this.isInsurChecked = formArray.at(6)?.get('status')?.value === 1;
    }

    /**
     *
     * @function สำหรับการ patch array
     * @param service array จาก โครงสร้างข้อมูล > ข้อมูล พ.ร.บ. > ตั้งค่าบริการ
     */
    private addServiceTransaction(service: any): void {
        const serviceFormGroup = this._formBuilder.group({
            service_id: [service.service_id],
            service_name: [service.service_name],
            status: [service.status],
            service_price: [
                {
                    value: service.service_price,
                    disabled: service.status === 0,
                },
            ],
            is_vat: '',
        });

        serviceFormGroup
            .get('service_price')
            .valueChanges.subscribe((value) => {
                this.sumTotal();
            });

        serviceFormGroup.get('status').valueChanges.subscribe((checked) => {
            const servicePriceControl = serviceFormGroup.get('service_price');
            if (checked) {
                servicePriceControl.enable();
                serviceFormGroup
                    .get('status')
                    .setValue(1, { emitEvent: false });
            } else {
                servicePriceControl.disable();
                serviceFormGroup
                    .get('status')
                    .setValue(0, { emitEvent: false });
            }
            this._changeDetectorRef.detectChanges();
        });
        this.servicesFormArray.push(serviceFormGroup);
    }

    /**
     *
     * @function สำหรับการดำเนินการกับข้อมูลและการแสดงผลของ'ค่าบริการ'ที่เกี่ยวข้อง
     * @param service array จาก โครงสร้างข้อมูล > ข้อมูล พ.ร.บ. > ตั้งค่าบริการ
     * @param index ตำแหน่งของ array ที่จะดำเนินการ
     */
    private onCheckboxChange(service: FormGroup, index: number): void {
        if (this.isAutoPatch) {
            return; // 🛑 ไม่ทำอะไรถ้าเป็นการ patch จากระบบ
        }
        const status = service.get('status').value;
        if (status && this.isAtLeastOneService()) {
            this.serviceRequireError = false;
        }

        // switch (index) {
        //     // add service slot
        //     case 2:
        //         this.isTaxChecked = status;
        //         this.updateFormArrayStatus(3, status);
        //         this.updateFormArrayStatus(4, status);
        //         this.updateFormArrayStatus(5, false);
        //         status
        //             ? this.formData.get('tax_vehicle').setValue('check')
        //             : this.formData.get('tax_vehicle').setValue(null);
        //         if (status) {
        //             this.openLackOfTax();
        //         }
        //         break;
        //     case 7:
        //         this.isLPGChecked = status;
        //         this.updateFormArrayStatus(8, false);
        //         this.updateFormArrayStatus(9, false);
        //         break;
        //     case 10:
        //         this.isNGVChecked = status;
        //         this.updateFormArrayStatus(11, false);
        //         break;

        //     // open specific dialog
        //     case 1:
        //         this.isActChecked = status;
        //         if (status) {
        //             this.openActPeriod();
        //         } else {
        //             this.clearActPeriodValues();
        //         }
        //         break;
        //     case 6:
        //         this.isInsurChecked = status;
        //         if (status) {
        //             this.openInsurData();
        //         }
        //         break;
        //     case 15:
        //         this.isEmsChecked = status;
        //         if (status) {
        //             this.emsDialog();
        //         }
        //         break;

        //     case 13:
        //         this.isOtherChecked = status;
        //         break;
        //     case 14:
        //         this.isOther2Checked = status;
        //         break;
        //     default: /** console.warn(`Unhandled checkbox index: ${index}`); */
        // }

        switch (index) {
            case 1:
                this.isActChecked = status;
                if (status) {
                    this.openActPeriod();
                } else {
                    this.clearActPeriodValues();
                }
                break;

            case 2:
                this.isTaxChecked = status;
                this.updateFormArrayStatus(3, status);
                this.updateFormArrayStatus(4, status);
                this.updateFormArrayStatus(5, false);
                this.formData.get('tax_vehicle').setValue(status ? 'check' : null);
                status ? this.openLackOfTax() : this.clearTaxValues();
                break;

            case 6:
                this.isInsurChecked = status;
                status ? this.openInsurData() : this.clearInsurValues();
                break;

            case 7:
                this.isLPGChecked = status;
                this.updateFormArrayStatus(8, false);
                this.updateFormArrayStatus(9, false);
                if (!status) {
                    this.clearLPGValues();
                }
                break;

            case 10:
                this.isNGVChecked = status;
                this.updateFormArrayStatus(11, false);
                if (!status) {
                    this.clearNGVValues();
                }
                break;

            case 13:
                this.isOtherChecked = status;
                if (!status) this.clearOtherValues();
                break;

            case 14:
                this.isOther2Checked = status;
                if (!status) this.clearOther2Values();
                break;

            case 15:
                this.isEmsChecked = status;
                status ? this.emsDialog() : this.clearEmsValues();
                break;
        }

        this.sumTotal();
        this._changeDetectorRef.detectChanges();
    }
    /**
     *
     * @function ส่วนสนับสนุนการแก้ไข status ของ'ค่าบริการ'่ผ่าน index ที่ระบุ
     * @param index ตำแหน่งของ'ค่าบริการ'่บน array (เริ่มต้นที่ 0 **นับจากบนลงล่างได้เช่นกัน)
     * @param status สถานะใหม่ที่ต้องการแทนที่ใน status ของ'ค่าบริการ'่บนตำแหน่งนั้น ๆ
     */
    private updateFormArrayStatus(index: number, status: boolean): void {
        if (this.servicesFormArray.at(index)) {
            this.servicesFormArray.at(index).patchValue({ status: status });
        }
    }

    /**
     *
     * @param vehicleNumber ทะเบียนรถแบบเต็ม ใช้สำหรับแยกตัวอักษรและเลขด้วย'-'แล้วทำการ patch
     *  **รวมไปถึงการ patch ข้อมูลพื้นฐานของพาหนะและรับ API ข้อมูลเชื้อเพลิง
     *  **ทำงานเมื่อ trigger '(optionSelected)' ผ่าน HTML
     */
    onVehicleSelected(event: { option?: { viewValue?: unknown; value?: unknown } } | string): void {
        let selectedVehicle: (typeof this.listVehicles)[number] | undefined;
        if (event && typeof event === 'object' && event.option?.viewValue != null) {
            const plate = event.option.viewValue.toString().trim();
            selectedVehicle = this.listVehicles.find(
                (v) => (v.license_plate ?? '').toString().trim() === plate
            );
        }
        const key = (
            typeof event === 'string' ? event : event?.option?.value ?? ''
        )
            .toString()
            .trim();
        if (!selectedVehicle) {
            const picked = this._splitLicensePlate(key);
            const fornt = picked.letters;
            const back = picked.number;
            selectedVehicle = this.listVehicles.find((v) => {
                const parts = this._splitLicensePlate(v.license_plate ?? '');
                if (key.includes('-')) {
                    return parts.letters === fornt && parts.number === back;
                }
                return parts.number === key;
            });
        }

        if (!selectedVehicle) {
            return;
        }

        const selectedProvince = this.listProvinces.find(
            (p) => p.id === selectedVehicle.province_id
        );
        const provinceName = selectedProvince ? selectedProvince.name_th : null;

        const parts = this._splitLicensePlate(selectedVehicle.license_plate ?? '');

        this.formData.patchValue({
            ...selectedVehicle,
            licenseLetters: parts.letters,
            licenseNumber: parts.number,
            province: provinceName,
            regeister_date: selectedVehicle.registration_date,
            tax_due_date: selectedVehicle.notificate_tax,
        });

        this._changeDetectorRef.detectChanges();
        this.getFueltype(selectedVehicle.fuel_type);

        if (selectedVehicle.id) {
            this._Service
                .getCusCarItem(selectedVehicle.id)
                .subscribe((resp) => {
                    this.formData_CusCar.patchValue({ ...resp.data });
                    if (resp.data.customer_id) {

                        this._US.confirmAction(
                            'คุณต้องการโหลดข้อมูลลูกค้าเดิมหรือไม่?',
                            '',
                            this._fuseConfirm,
                            () => {
                                this._Service.getCustomerID(resp.data.customer_id).subscribe((resp) => {
                                    this.patchCustomerFromApi(resp.data, {
                                        openAddressDialog: true,
                                    });
                                });
                            }
                        );
                    }
                });
            this.forceCall(selectedVehicle.id);
            this.cusCarGasCache = selectedVehicle;
            this._changeDetectorRef.detectChanges();
        }
    }

    /**
     *
     * @param customer ข้อมูลของลูกค้า สำหรับ patch ข้อมูลอื่น ๆ ที่เกี่ยวข้อง
     *  **ทำงานเมื่อ trigger '(optionSelected)' ผ่าน HTML
     */
    customerID: number;
    onCustomerSelected(customer: any): void {
        if (!customer?.id) {
            return;
        }
        this.formData.patchValue(
            {
                name: customer.name ?? '',
                lname: customer.lname ?? '',
            },
            { emitEvent: false }
        );
        this._Service.getCustomerID(customer.id).subscribe((resp) => {
            this.patchCustomerFromApi(resp.data, { openAddressDialog: true });
        });
    }

    onCustomerTypeChange(type: string): void {
        if (type === 'vendor') {
            this.formData.addControl('is_headquarter', new FormControl(true));
        } else {
            this.formData.removeControl('is_headquarter');
        }
    }

    get hasLinkedCustomer(): boolean {
        return !!this.formData?.get('customer_id')?.value;
    }

    /** สรุปลูกค้aที่เชื่อมแล้ว (ไม่แสดง customer id) */
    get linkedCustomerSummary(): string {
        const no = this.formData_CusData?.get('no')?.value;
        const first = (this.formData?.get('name')?.value ?? '').toString().trim();
        const last = (this.formData?.get('lname')?.value ?? '').toString().trim();
        const namePart = [first, last].filter(Boolean).join(' ').trim();
        if (no && namePart) {
            return `${no} · ${namePart}`;
        }
        return no || namePart || 'ลูกค้าในระบบ';
    }

    clearLinkedCustomer(): void {
        this.customerID = null;
        this.formData.patchValue({ customer_id: null }, { emitEvent: false });
        this._changeDetectorRef.markForCheck();
    }

    /** เปิดไฮไลต์ช่องบังคับหลังกดบันทึก */
    saveValidationAttempted = false;
    /** ยังไม่เลือกบริการอย่างน้อย 1 รายการ */
    serviceRequireError = false;

    fieldHasError(controlName: string): boolean {
        if (!this.saveValidationAttempted) {
            return false;
        }
        const control = this.formData.get(controlName);
        return !!control && control.invalid;
    }

    patchCustomerFromApi(
        data: any,
        options: { openAddressDialog?: boolean } = {}
    ): void {
        if (!data) {
            return;
        }

        const type = data.type || 'personal';
        this.onCustomerTypeChange(type);
        this.customerID = data.id;

        this.formData.patchValue(
            {
                customer_id: data.id,
                type,
                name: data.name ?? '',
                lname: data.lname ?? '',
                tax_id: data.tax_id,
                email: data.email,
                phone_number1: data.phone_number1,
                phone_number2: data.phone_number2,
                note: data.note,
                is_headquarter: data.is_headquarter,
            },
            { emitEvent: false }
        );

        this.formData_CusData.patchValue({ ...data }, { emitEvent: false });
        const addressArray = this.formData_CusData.get('address_arr') as FormArray;
        addressArray.clear();

        (data.customer__addresses ?? []).forEach((address: any) => {
            addressArray.push(
                this._formBuilder.group({
                    id: address.id,
                    address: address.address,
                    zip_code: address.zip_code,
                    is_main: address.is_main,
                    province_name: address.provinces?.name_th,
                    district_name: address.districts?.name_th,
                    subdistrict_name: address.sub_districts?.name_th,
                    province_id: address.province_id,
                    district_id: address.district_id,
                    subdistrict_id: address.subdistrict_id,
                })
            );
        });

        this._changeDetectorRef.markForCheck();

        if (options.openAddressDialog) {
            this.openAddressSelectionDialog();
        }
    }

    /**
     *
     * @function ฟังก์ชันสำหรับเชื่อมที่อยู่ทั้งหมดเป็น string เดียว
     */
    saveAddress(): void {
        const address = this.formData_address.value;
        this.formData.patchValue({
            ems_province_id: address.ems_province_id,
            ems_district_id: address.ems_district_id,
            ems_subdistrict_id: address.ems_subdistrict_id,
            ems_address: address.ems_address,
            ems_name: address.ems_name,
        });
        this.formData.patchValue({
            address: `${address.address} ${address.subdistricts} ${address.districts} ${address.province}  ${address.zip_code}`,
        });
        this.closeDialog();
    }
    saveAddress2(): void {
        const address = this.formData_addressems.value;
        this.formData.patchValue({
            ems_province_id: address.ems_province_id,
            ems_district_id: address.ems_district_id,
            ems_subdistrict_id: address.ems_subdistrict_id,
            ems_address: address.ems_address,
            ems_name: address.ems_name,
        });
        this.closeDialog();
    }
    saveAddress3(addressId?: number): void {
        const addressArray = this.formData_CusData.get('address_arr').value;
        const selectedAddress = addressArray.find(
            (address: any) => address.id === addressId
        );

        if (addressId) {
            this.formData.patchValue({
                ems_address: selectedAddress.address,
                ems_province_id: selectedAddress.province_id,
                ems_district_id: selectedAddress.district_id,
                ems_subdistrict_id: selectedAddress.subdistrict_id,
                ems_name: this.formData_CusData.get('name').value,
                address: `${selectedAddress.address} ${selectedAddress.subdistrict_name} ${selectedAddress.district_name} ${selectedAddress.province_name}  ${selectedAddress.zip_code}`,
            });

            this.closeDialog();
        }
    }

    saveAddresscustomer(): void {
        if (!this.formData_address.valid) {
            this._fuseConfirm.open({
                title: 'กรุณาระบุข้อมูล',
                message: 'กรุณากรอกข้อมูลให้ครบถ้วน',
                icon: {
                    show: true,
                    name: 'heroicons_outline:exclamation',
                    color: 'warning',
                },
                actions: { confirm: { show: false }, cancel: { show: false } },
                dismissible: true,
            });
            return;
        }

        if (
            this.formData_address.get('is_main')?.value &&
            !this.editAddressId
        ) {
            const mainConfirmation = this._fuseConfirm.open({
                title: 'ยืนยันการตั้งค่าที่อยู่หลัก',
                message:
                    'การตั้งค่าที่อยู่นี้เป็นที่อยู่หลักจะยกเลิกที่อยู่หลักเดิม คุณต้องการดำเนินการต่อหรือไม่?',
                icon: {
                    show: false,
                    name: 'heroicons_outline:exclamation',
                    color: 'warning',
                },
                actions: {
                    confirm: { show: true, label: 'ยืนยัน', color: 'sky' },
                    cancel: { show: true, label: 'ยกเลิก' },
                },
                dismissible: true,
            });

            mainConfirmation.afterClosed().subscribe((result) => {
                if (result === 'confirmed') {
                    this.proceedWithSave();
                }
            });
        } else {
            this.proceedWithSave();
        }
    }
    private proceedWithSave(): void {
        const confirmation = this._fuseConfirm.open({
            title: this.editAddressId ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูล',
            message: `คุณต้องการ${this.editAddressId ? 'แก้ไข' : 'เพิ่ม'
                }ข้อมูลใช่หรือไม่`,
            icon: {
                show: false,
                name: 'heroicons_outline:exclamation',
                color: 'warning',
            },
            actions: {
                confirm: { show: true, label: 'ยืนยัน', color: 'sky' },
                cancel: { show: true, label: 'ยกเลิก' },
            },
            dismissible: true,
        });


        confirmation.afterClosed().subscribe((result) => {
            if (result === 'confirmed') {
                const formValue = this.formData_addresscustomer.value;
                formValue.is_main = formValue.is_main ? 1 : 0; // เปลี่ยน 0 1

                const observable = this.editAddressId
                    ? this._Service.updateCusAddress(
                        formValue,
                        this.editAddressId
                    )
                    : this._Service.createCusAddress(formValue);

                observable.subscribe({
                    next: (resp) => {
                        this._Service
                            .getCustomerID(this.customerID)
                            .subscribe((resp) => {
                                this.formData_CusData.patchValue({
                                    ...resp.data,
                                });
                                const addressArray = this.formData_CusData.get(
                                    'address_arr'
                                ) as FormArray;
                                addressArray.clear();

                                resp.data.customer__addresses.forEach(
                                    (address: any) => {
                                        addressArray.push(
                                            this._formBuilder.group({
                                                id: address.id,
                                                address: address.address,
                                                zip_code: address.zip_code,
                                                is_main: address.is_main,
                                                province_name:
                                                    address.provinces?.name_th,
                                                district_name:
                                                    address.districts?.name_th,
                                                subdistrict_name:
                                                    address.sub_districts
                                                        ?.name_th,
                                                province_id:
                                                    address.province_id,
                                                district_id:
                                                    address.district_id,
                                                subdistrict_id:
                                                    address.subdistrict_id,
                                            })
                                        );
                                    }
                                );
                                this._changeDetectorRef.markForCheck();
                                this.closeDialog(this.AddressDialogcustomerRef);
                            });
                    },
                    error: (err) => {
                    },
                });
            }
        });
    }
    deleteAddress(id: number): void {
        const confirmation = this._fuseConfirm.open({
            title: 'ลบข้อมูล',
            message: 'คุณต้องการลบข้อมูลใช่หรือไม่',
            icon: {
                show: false,
                name: 'heroicons_outline:exclamation',
                color: 'warning',
            },
            actions: {
                confirm: { show: true, label: 'ยืนยัน', color: 'sky' },
                cancel: { show: true, label: 'ยกเลิก' },
            },
            dismissible: true,
        });

        confirmation.afterClosed().subscribe((result) => {
            if (result === 'confirmed') {
                this._Service.deleteCusAddress(id).subscribe({
                    next: (resp) => {
                        this._Service
                            .getCustomerID(this.customerID)
                            .subscribe((resp) => {
                                this.formData_CusData.patchValue({
                                    ...resp.data,
                                });
                                const addressArray = this.formData_CusData.get(
                                    'address_arr'
                                ) as FormArray;
                                addressArray.clear();

                                resp.data.customer__addresses.forEach(
                                    (address: any) => {
                                        addressArray.push(
                                            this._formBuilder.group({
                                                id: address.id,
                                                address: address.address,
                                                zip_code: address.zip_code,
                                                is_main: address.is_main,
                                                province_name:
                                                    address.provinces?.name_th,
                                                district_name:
                                                    address.districts?.name_th,
                                                subdistrict_name:
                                                    address.sub_districts
                                                        ?.name_th,
                                                province_id:
                                                    address.province_id,
                                                district_id:
                                                    address.district_id,
                                                subdistrict_id:
                                                    address.subdistrict_id,
                                            })
                                        );
                                    }
                                );
                                this._changeDetectorRef.markForCheck();
                            });
                    },
                    error: (err) => {
                        this._fuseConfirm.open({
                            title: 'เกิดข้อผิดพลาด',
                            message:
                                err.error?.message ||
                                'เกิดข้อผิดพลาดในการลบข้อมูล',
                            icon: {
                                show: true,
                                name: 'heroicons_outline:exclamation',
                                color: 'warning',
                            },
                            actions: {
                                confirm: { show: false },
                                cancel: { show: false },
                            },
                            dismissible: true,
                        });
                    },
                });
            }
        });
    }
    /**
     *
     * @param fuelType ชนิดของเชื้อเพลิงที่ส่งเข้ามาเพื่อจำแนกข้อมูล
     */
    getFueltype(fuelType: string) {
        if (this.selectedFuelType === fuelType) {
            this.selectedFuelType = null;
            this.formData.get('fuel_type').setValue(null);
        } else {
            this.selectedFuelType = fuelType;
            this.formData.get('fuel_type').setValue(fuelType);
        }
    }

    /**
     *
     * @function ฟังก์ชันสำหรับกำหนดประเภทผู้ใช้บริการ
     */
    isCorporate: boolean = false;
    getCorporateStatus() {
        this.isCorporate = !this.isCorporate;
        this.formData
            .get('is_corporate')
            .setValue(this.isCorporate ? '1' : '0');
    }

    /**
     *
     * @subject การประกาศฟังก์ชันที่เกี่ยวข้องกับ API (คำนวณภาษี) สำหรับการหน่วงเวลาก่อนเริ่มการทำงาน
     *  **เพื่อหลีกเลี่ยงการ spam API request เนื่องจากการสมัครสมาชิก valueChange จะทำให้เกิดการ request ทุกครั้งที่ผู้ใช้พิมพ์ค่าใด ๆ
     * @param vehicle_inspection_types_id ID ของประเภทรถ สำหรับ request อัตราคำนวณใน'ภาษีประจำปี'
     */
    private carCheckSubject = new Subject<any>();
    private calTaxSubject = new Subject<any>();
    private calGasSubject = new Subject<any>();
    private calTaxserviceSubject = new Subject<any>();
    onVehicleTypeChange(vehicle_inspection_types_id: number) {
        const requestData = {
            vehicle_inspection_types_id,
            vehicleinspectiontypes: vehicle_inspection_types_id,
            ...this.formData.value,
        };
        const requestData2 = {
            vehicle_inspection_types_id,
            vehicleinspectiontypes: vehicle_inspection_types_id,
            service_id: 5,
        };

        this.carCheckSubject.next(requestData);
        this.calTaxSubject.next(requestData);
        this.calGasSubject.next(requestData);
        this.calTaxserviceSubject.next(requestData2);
    }

    /**
     *
     * @param fuelType string ประเภทเชื้อเพลิง รับข้อมูลโดยตรงจาก HTML
     */
    setFuelType(fuelType: string): void {
        if (this.selectedFuelType === fuelType) {
            this.selectedFuelType = 'oil';
        } else {
            this.selectedFuelType = fuelType;
        }
        this.formData.patchValue({ fuel_type: this.selectedFuelType });
    }

    /**
     *
     * @function set สภานะประเภทผู้ใช้บริการ ใช้งานโดยตรงจาก HTML
     */
    setCorporateStatus(): void {
        this.isCorporate = !this.isCorporate;
        this.formData.patchValue({
            is_corporate: this.isCorporate ? '1' : '0',
        });
    }

    // #endregion
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // #region CRUD Operations

    create(): void {
        const rawLicensePlate = this.formData.controls['license_plate'].value;
        const cleanedLicensePlate = rawLicensePlate
            ? rawLicensePlate.replace(/\s|/g, '')
            : '';
        const formData2 = { ...this.formData.value };


        const datePipe = new DatePipe("en-US");
        const regeister_date = datePipe.transform(
            this.formData.value.regeister_date,
            "yyyy-MM-dd"
        );
        const date = datePipe.transform(
            this.formData.value.date,
            "yyyy-MM-dd"
        );
        const tax_due_date = datePipe.transform(
            this.formData.value.tax_due_date,
            "yyyy-MM-dd"
        );
        const tax_renewal_date = datePipe.transform(
            this.formData.value.tax_renewal_date,
            "yyyy-MM-dd"
        );
        const appointment = datePipe.transform(
            this.formData.value.appointment,
            "yyyy-MM-dd"
        );

        this.formData.patchValue({
            license_plate: cleanedLicensePlate,
            regeister_date: regeister_date,
            date: date,
            tax_due_date: tax_due_date,
            tax_renewal_date: tax_renewal_date,
            appointment: appointment,
        });
        this.saveValidationAttempted = true;
        this.serviceRequireError = false;
        this.formData.markAllAsTouched();
        this._changeDetectorRef.detectChanges();

        formData2.List_service_tran = formData2.List_service_tran.map((item) => ({
            ...item,
            service_price: item.service_price
                ? item.service_price.toString().replace(/,/g, '')
                : '0',
        }));

        if (this.formData.invalid) {
            this._US.confirmAction(
                'กรุณากรอกข้อมูลให้ครบ',
                'กรุณาตรวจสอบและกรอกข้อมูลให้ครบ',
                this._fuseConfirm,
                () => { },
                {
                    showConfirm: false,
                    showCancel: false,
                }
            );
            return;
        }
        if (!this.isAtLeastOneService()) {
            this.serviceRequireError = true;
            this._changeDetectorRef.detectChanges();
            this._US.confirmAction(
                'กรุณาระบุบริการ',
                'กรุณาระบุบริการอย่างน้อย 1 รายการ',
                this._fuseConfirm,
                () => { },
                {
                    showConfirm: false,
                    showCancel: false,
                }
            );
            return;
        }
        if (!this.formData.get('fuel_type')?.value) {
            this.formData.patchValue({ fuel_type: 'oil' });
        }

        this.flashMessage = null;
        const formData = this.formData.value;
        formData.is_headquarter = formData.is_headquarter ? 1 : 0;

        let listServiceTran = this.formData.get('List_service_tran') as FormArray;
        listServiceTran.controls.forEach((group: FormGroup) => {
            let priceControl = group.get('service_price');
            if (priceControl?.value === undefined) {
                priceControl.setValue(0);
            }
            priceControl?.enable();
        });

        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const branchId = userData.employees?.branch_id || null;
        const payload = {
            ...formData,
            List_service_tran: listServiceTran.value,
            branch_id: branchId,
        };

        const provinceName = this.listProvinces.find(p => p.id === formData.province_id)?.name_th || '';
        const vehicleTypeName = this.listVehicleInspection.find(v => v.id === formData.vehicle_inspection_types_id)?.name || '';
        const insuranceTypeName = this.listInsuranceTypes.find(i => i.id === formData.insurance_types_id)?.name || '';
        const customerTypeLabel = this.customerTypes.find(c => c.value === formData.type)?.label || '';
        const dialogRef = this._matDialog.open(ConfirmDialogComponent, {
            width: '80%',
            data: {
                values: payload,
                province: provinceName,
                vehicleType: vehicleTypeName,
                insuranceType: insuranceTypeName,
                customerType: customerTypeLabel
            }
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result === 'confirmed') {
                if (this.billId) {
                    this._Service.update(this.billId, payload).subscribe({
                        next: (resp: any) => {
                            this.updateResp = resp;
                            this.showFlashMessage('success');
                            this.openpaidType();
                            this._router.navigate(['/bill_create/list'], {
                                queryParams: { id: this.billId }
                            });
                        },
                        error: (error: any) => {
                            this.handleApiError(error);
                        },
                    });
                } else {
                    this._Service.create(payload).subscribe({
                        next: (resp: any) => {
                            this._router.navigate(['/bill_create/list'], {
                                queryParams: { id: resp.data.id }
                            });
                            this._Service
                                .getVehicle_CusCar(resp.data.car_id)
                                .subscribe({
                                    next: (resp: any) => {

                                        this.formData_CusCar.patchValue({
                                            ...resp.data,
                                        });

                                        this.cusCarGasCache = resp.data;
                                    },
                                    error: (error: any) => {
                                        this.handleApiError(error);
                                    },
                                });
                            this._Service
                                .getCustomerID(resp.data.customer_id)
                                .subscribe((resp) => {
                                    this.formData_CusData.patchValue({
                                        ...resp.data,
                                    });
                                });

                            this.createResp = resp;
                            this.billId = resp.data.id;

                            if (this.isAddressFilled()) {
                                this.formData_address.patchValue({
                                    customer_id: resp.data.customer_id,
                                });

                                this._Service
                                    .createCustomerAddress(
                                        this.formData_address.value
                                    )
                                    .subscribe({
                                        next: (addressResp: any) => {
                                            this.showFlashMessage('success');
                                        },
                                        error: (addressErr: any) => {
                                            this.handleApiError(addressErr);
                                        },
                                    });
                            } else {
                                this.showFlashMessage('success');
                            }

                            this.formData_CarCheck
                                .get('id')
                                .patchValue(this.billId);

                            this.openpaidType();
                        },
                        error: (vehicleErr: any) => {
                            this.handleApiError(vehicleErr);
                        },
                    });
                }

                listServiceTran.controls.forEach((group: FormGroup) => {
                    if (!group.get('status')?.value) {
                        group.get('service_price')?.disable();
                    }
                    this._changeDetectorRef.detectChanges();
                });
            }
        });
    }

    private isAddressFilled(): boolean {
        const address = this.formData_address.value;
        return (
            address.address &&
            address.province &&
            address.districts &&
            address.subdistricts &&
            address.zip_code
        );
    }
    private isAtLeastOneService(): boolean {
        return this.servicesFormArray.controls.some(
            (control) => control.value.status === 1
        );
    }

    // #endregion
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // #region Tab/Dialog Operations

    // tabsStatus: boolean[] = [true, false, true, true];

    private selectedTabIndex: number = 0;
    private selectedTabMain: number = 0;

    /**
     *
     * @param index หน้าที่ต้องการเปลี่ยนสำหรับ mat-tab
     *  **ปัจจุบันใช้เฉพาะใน paidType dialog
     */
    changeTab(index: number): void {
        this.selectedTabIndex = index;
    }
    /**
     *
     * @param index หน้าปัจจุบันของ mat-tab เก็บบันทึกค่าโดยอัตโนมัติระหว่างโต้ตอบกับผูัใช้
     *  **ปัจจุบันใช้เฉพาะใน paidType dialog
     */
    onTabChange(index: number): void {
        this.paidTypeRef.updateSize(
            index === 2 ? '90%' : this.reduceScreen ? '90%' : '60%'
        );
    }
    /**
     *
     * @param Ref ID ของ dialog ใช้สำหรับเจาะจงการปิด dialog นั้น ๆ เพื่อป้องการปิด doalog อื่นโดยไม่ตั้งใจ
     * @param request string อะไรก็ได้ ส่งเพื่อระบุว่าต้องการดำเนินการอื่นเพิ่มเติมเมื่อทำการปิด dialog Ref นั้น ๆ
     */
    closeDialog(Ref?: any, request?: string): void {
        if (Ref && request) {
            switch (Ref) {
                case this.actPeriodRef:
                    this.servicesFormArray.at(1).patchValue({ status: false });
                    this.isActChecked = false;
                    break;
                case this.lackOfTaxRef:
                    this.servicesFormArray.at(2).patchValue({ status: false });
                    this.isTaxChecked = false;
                    break;
                case this.insurDataRef:
                    this.servicesFormArray.at(5).patchValue({ status: false });
                    this.isInsurChecked = false;
                    break;
                case this.addressSelectionDialogRef:
                    this.servicesFormArray.at(15).patchValue({ status: false });
                    this.isEmsChecked = false;
                    this.formData_addressems.reset();
                    this.formData.patchValue({
                        ems_address: null,
                        ems_district_id: null,
                        ems_subdistrict_id: null,
                        ems_province_id: null,
                        ems_name: null,
                    });
                    break;
                case this.addressDialog2Ref:
                    this.formData_addressems.reset();
                    this.formData.patchValue({
                        ems_address: null,
                        ems_district_id: null,
                        ems_subdistrict_id: null,
                        ems_province_id: null,
                        ems_name: null,
                    });
                    break;
            }
        }

        Ref ? this._US.closeDialog(Ref) : this._matDialog.closeAll();
        this._changeDetectorRef.markForCheck();
    }


    /**
     *
     * @param dialogRef object ของ dialog ที่รับผ่าน Ref จาก closeDialog() เพื่อใช้ในการเข้าถึง activities ที่เกิดขึ้นกับ dialog
     */
    private trackBackdropClick(dialogRef: MatDialogRef<any> | undefined): void {
        if (dialogRef) {
            dialogRef.backdropClick().subscribe(() => {
                this.onBackdropClick(dialogRef);
            });
        }
    }
    /**
     *
     * @param dialogRef ID ของ dialog ที่รับจาก trackBackdropClick() เพื่อทำงานต่อเนื่องในการปิด dialog แบบเจาะจง
     */
    private onBackdropClick(dialogRef: MatDialogRef<any>): void {
        this.closeDialog(dialogRef, 'forceClose');
    }

    /**
     *
     * @function 5 ฟังก์ชันนี้สำหรับเปิด dialog โดยเก็บบันทึก ID ของการเปิด dialog แต่ละอันลงในตัวแปร public
     */
    openActPeriod(): void {
        const InsuranceID = this.formData.get('insurance_types_id').value;
        this._Service.getInsuranceID(InsuranceID).subscribe((resp) => {
            this.inspectRate = resp.data.price;
            this.stampRate = resp.data.stamp;
            this.adjustValue(0);
        });

        const prbValue4 = Number(this.formData.get('prb_service_cache').value);
        this.formData_ActPeriod.get('prb_value4').patchValue(prbValue4);
        this.adjustValue(0);

        this.actPeriodRef = this._matDialog.open(this.ActPeriod, {
            width: this.reduceScreen ? '90%' : '40%',
        });
        this.trackBackdropClick(this.actPeriodRef);
    }
    openLackOfTax(): void {
        this.lackOfTaxYear(this.currentYear);
        this.lackOfTaxRef = this._matDialog.open(this.LackOfTax, {
            width: this.reduceScreen ? '90%' : '40%',
        });
        this.trackBackdropClick(this.lackOfTaxRef);
    }
    openInsurData(): void {
        this.insurDataRef = this._matDialog.open(this.InsurData, {
            width: this.reduceScreen ? '90%' : '40%',
        });
        this.trackBackdropClick(this.insurDataRef);
    }
    openAddressDialog(): void {
        this.addressDialogRef = this._matDialog.open(this.AddressDialog, {
            width: this.reduceScreen ? '90%' : '40%',
        });
        this.trackBackdropClick(this.addressDialogRef);
    }
    openAddressDialog2(): void {
        this.addressDialog2Ref = this._matDialog.open(this.AddressDialog2, {
            width: this.reduceScreen ? '90%' : '40%',
        });
        this.trackBackdropClick(this.addressDialog2Ref);
    }
    openAddressSelectionDialog(): void {
        this.addressSelectionDialogRef = this._matDialog.open(
            this.AddressSelectionDialog,
            {
                width: this.reduceScreen ? '60%' : '40%',
            }
        );
        this.trackBackdropClick(this.addressSelectionDialogRef);
    }
    openAddressSelectionDialogems(): void {
        this.addressSelectionDialogemsRef = this._matDialog.open(
            this.AddressSelectionDialogems,
            {
                width: this.reduceScreen ? '70%' : '40%',
            }
        );
        this.trackBackdropClick(this.addressSelectionDialogemsRef);
    }
    private editAddressId: number | null = null;

    openAddressDialogcustomer(id?: any): void {
        this.formData_addresscustomer.reset();
        this.editAddressId = id || null;
        const addressId = id || null;
        if (addressId) {
            this._Service.getCusAddressById(addressId).subscribe((resp) => {
                if (resp.status && resp.data) {
                    const address = resp.data;
                    this.formData_addresscustomer.patchValue({
                        address: address.address,
                        province: address.provinces.name_th,
                        province_id: address.province_id,
                        districts: address.districts.name_th,
                        district_id: address.district_id,
                        subdistricts: address.sub_districts.name_th,
                        subdistrict_id: address.subdistrict_id,
                        zip_code: address.zip_code,
                        customer_id: address.customer_id,
                        is_main: address.is_main,
                    });
                }
            });
        } else {
            this.formData_addresscustomer.patchValue({
                customer_id: this.formData_CusData.get('id').value,
                is_main: 0,
            });
        }

        this.AddressDialogcustomerRef = this._matDialog.open(
            this.AddressDialogcustomer,
            {
                width: '90%',
            }
        );
        this.trackBackdropClick(this.AddressDialogcustomerRef);
    }

    // openAddressDialog(): void
    // {
    //     const dialogRef = this._matDialog.open(AddressDialogComponent, {
    //         width: this.reduceScreen ? '90%' : '40%',
    //         data: {
    //             addressForm: this.cusDataAddressDialog ? this.formAddress_CusData : this.formData_address,
    //             cusDataAddressDialog: this.cusDataAddressDialog,
    //             filteredProvincesAddress: this.filteredProvincesAddress,
    //             filteredDistricts: this.filteredDistricts,
    //             filteredSubDistricts: this.filteredSubDistricts
    //         }
    //     });

    //     dialogRef.afterClosed().subscribe(result => {
    //         if (result) {
    //             // result คือค่าที่ user กรอกในฟอร์ม address
    //             // สามารถ patch ลงใน formData ได้ตามต้องการ
    //             this.formData.patchValue({
    //                 address: `${result.address} ${result.subdistricts} ${result.districts} ${result.province} ${result.zip_code}`,
    //             });

    //             this.addressDialogRef = result;
    //         }
    //     });
    // }
    openWithholdingTax(): void {
        this.WithholdingTaxRef = this._matDialog.open(this.WithholdingTax, {
            width: this.reduceScreen ? '60%' : '40%',
        });
        this.trackBackdropClick(this.WithholdingTaxRef);
    }
    openpaidType(page?: number): void {
        this.sumTotal();
        this.callInspectId(this.billId);

        if (this.billId) {
            this.loadPaymentInfo(this.billId).then(() => {
                this.formData
                    .get('last_price')
                    .patchValue(this.formData.get(this.paidState())?.value);
            });
        } else {
            this.formData
                .get('last_price')
                .patchValue(this.formData.get(this.paidState())?.value);
        }

        this.paidTypeRef = this._matDialog.open(this.paidType, {
            width: this.reduceScreen ? '90%' : '60%',
        });
        this.trackBackdropClick(this.paidTypeRef);
        this.changeTab(0);
        if (page) this.changeTab(page);
    }
    /** affect under dialog */
    public paidTypeButtonOpen: boolean = true;

    /**
     *
     * @param paidStatus รูปแบบการชำระบิล (เต็มจำนวน/ แบ่งจ่าย/ ค้างจ่าย)
     */
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

    /**
     *
     * @param paidResult วิธีที่ชำระบิล (ชำระเงินสด/ โอนผ่านธนาคาร/ บัตรเครดิต)
     *  **หมายเหตุ: ถูกยกเลิกใน commit 23c0835**
     */
    updatePaidResult() {
        const data = {
            inspection_id: this.billId,
            date: this.formData.get('installment_date').value,
            paid_type: this.formData.get('paid_type').value,
            description: this.formData.get('description').value,
            paid_price: this.formData.get('now_paid').value,
            type: 'nonvat',
        };
        const data2 = {
            inspection_id: this.billId,
            date: this.formData.get('installment_date').value,
            paid_type: this.formData.get('paid_type').value,
            description: this.formData.get('description').value,
            paid_price: this.formData.get('now_paid_vat').value,
            type: 'vat',
        };
        this.addInstallment(data, data2, this.billId);
        this.changeTab(2);
    }

    // paidState(): string { return this.billComplete ? 'remaining_amount' : 'total' }
    /**
     *
     * @returns API KEY request ของข้อมูลการชำระเงิน
     *  **หมายเหตุ: ถูกยกเลิกใน commit 157f275**
     */
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
        return 'total';
    }

    /**
     *
     * @returns สถานะปัจจุบันของบิล ใช้สำหรับการแสดงผลใน HTML
     *  **หมายเหตุ: ถูกยกเลิกใน commit 157f275**
     */
    billState(): boolean {
        return !(this.billStatus == 'finish' || this.billStatus == 'cancel');
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
                this.closeDialog(this.transecInformRef);
            },
            error: (err) => {
                this.handleApiError(err);
            },
        });
    }
    deleteTransec(id: string): void {
        this._Service.deleteTransec(id).subscribe({
            next: () => {
                this.callInspectId(this.billId);
                // this.closeDialog(this.transecInformRef);
            },
            error: (err) => {
                this.handleApiError(err);
            },
        });
    }

    /**
     *
     * @param inspectionId ID ของบิล สำหรับ API รับข้อมูลการชำระก่อนหน้า (ถ้ามี)
     */
    async loadPaymentInfo(inspectionId: number): Promise<void> {
        const resp = await firstValueFrom(
            this._Service.getPaymentInfo(inspectionId)
        );
        if (resp.data.total != null) {
            this.formData.patchValue({
                remaining_amount: resp.data.remaining_amount,
            });
        }
    }
    /**
     *
     * @param data ข้อมูลการชำระเงินปัจุบัน
     * @param specificId ID ของบิลที่ทำการอัพเดทข้อมูลการชำระเงิน
     */
    async addInstallment(
        data: any,
        data2: any,
        specificId?: number
    ): Promise<void> {
        const hasNonVat = this.servicesFormArray.controls.some(
            (control) => control.value.status === 1 && !control.value.is_vat
        );
        const hasVat = this.servicesFormArray.controls.some(
            (control) => control.value.status === 1 && control.value.is_vat
        );

        if (hasNonVat) {
            this._Service.installment_add(data).subscribe({
                next: () => {
                    if (specificId) {
                        this.callInspectId(specificId);
                    }
                },
                error: (err) => {
                    console.error('add failed', err);
                    this.showFlashMessage('error');
                },
            });
        }

        if (hasVat) {
            this._Service.installment_add(data2).subscribe({
                next: () => {
                    if (specificId) {
                        this.callInspectId(specificId);
                    }
                },
                error: (err) => {
                    console.error('add failed', err);
                    this.showFlashMessage('error');
                },
            });
        }
    }
    /**
     *
     * @function สำหรับการบังคับรีเฟรชตารางเสมือนที่ไม่สามารถใช้ rerender() ได้โดยตรง
     * @param id ID ของบิลที่ request ข้อมูลชุดใหม่เพื่อรีเฟรช
     */
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

    /**
     *
     * @function ชุดฟังก์ชันสำหรับการจัดการรูปภาพ
     *  **หมายเหตุ: ถูกยกเลิกใน commit b3d52dc**
     */
    files: File | null = null;
    imagePreview: string | null = null;

    openDocImage(): void {
        this.docImageRef = this._matDialog.open(this.DocImage, {
            width: '350px',
        });
    }

    onSelect(event: any) {
        this.files = event.addedFiles[0];

        const reader = new FileReader();
        reader.onload = (e: any) => {
            this.imagePreview = e.target.result;
        };
        reader.readAsDataURL(this.files);
    }
    onRemove(event) {
        this.files = null;
    }

    // #endregion
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // #region ActDialog

    currentYear: number = new Date().getFullYear() + 543;

    getNowDate(): void {
        this.formData_ActPeriod
            .get('date_start_prb')
            .patchValue(this.dateSuperFormat(new Date()));
    }

    /**
     *
     * @param year จำนวนปี สำหรับตั้งค่าสำเร็จรูปเพื่อเพิ่มส่วนต่างปีระหว่างวันที่เริ่มต้นและวันที่สิ้นสุดของ ActPeriod (พ.ร.บ. > ระยะคุ้มครอง พ.ร.บ.)
     */
    setEndDate(year: number): void {
        if (this.formData_ActPeriod.get('date_start_prb').value == '') {
            this.getNowDate();
        }
        const startDate = this.formData_ActPeriod.get('date_start_prb').value;
        const endDate = this.addYearsToDate(startDate, year);
        this.formData_ActPeriod.patchValue({
            periodrange: this.getDaysDifference(
                new Date(startDate),
                new Date(endDate)
            ),
            date_end_prb: this.dateSuperFormat(endDate),
        });
    }

    private timer: any;
    /**
     *
     * @param step ค่าสำหรับปรับส่วนต่างจำนวนวันใน ActPeriod (พ.ร.บ. > ระยะคุ้มครอง พ.ร.บ.) แบบต่อเนื่อง
     *  **สามารถกดปุ่มใน HTML ค้างไว้ 500ms เพื่อเพิ่มค่าต่อเนื่องทุก ๆ 100ms
     */
    startIncrement(step: number): void {
        this.adjustValue(step);
        this.timer = setTimeout(() => {
            this.timer = setInterval(() => this.adjustValue(step), 100);
        }, 500);
    }
    /**
     *
     * @function สำหรับหยุดการทำงานต่อเนื่องของ startIncrement()
     */
    stopAdjust(): void {
        clearInterval(this.timer);
        clearTimeout(this.timer);
    }

    private isAdjustingValue = false;
    private inspectRate: number;
    private stampRate: number;
    private totalDayInYear: FormControl = new FormControl('365');
    /**
     *
     * @param step ค่าสำหรับปรับส่วนต่างจำนวนวันใน ActPeriod (พ.ร.บ. > ระยะคุ้มครอง พ.ร.บ.)
     *  **มีส่วนสำหรับการคำนวณค่าใช้จ่ายอัตโนมัติ
     */
    adjustValue(step: number): void {
        this.isAdjustingValue = true;
        if (this.formData_ActPeriod.get('date_start_prb').value == '') {
            this.getNowDate();
        }

        const periodRange =
            Number(this.formData_ActPeriod.get('periodrange').value) || 0;
        const newPeriod = periodRange + step >= 1 ? periodRange + step : 1;
        const startDate = this.formData_ActPeriod.get('date_start_prb').value;

        // (เวอร์ชันแก้)
        // let stampRate: number;
        // const stampID = this.formData.get('insurance_types_id').value;
        // this._Service.getStampRate(stampID).subscribe((resp) => { stampRate = resp.data.stamp; });

        const prbValue1 = parseFloat(
            (
                (newPeriod * this.inspectRate) /
                this.totalDayInYear.value
            ).toFixed(2)
        ); // คิดเบี้ย
        // const prbValue2 = (1 + Math.floor(newPeriod / 120 * 1)); // อากรแสตมป์
        // const prbValue2 = this.stampRate; // อากรแสตมป์ (เวอร์ชันแก้1)
        const prbValue2 = Math.ceil((prbValue1 * 0.4) / 100); // อากรแสตมป์
        const prbValue3 = parseFloat(
            (((prbValue1) * 7) / 100).toFixed(2)
        ); // ภาษีมูลค่าเพิ่ม (7%) (คิดเบี้ย + อากรแสตมป์)
        const prbValue4 = parseFloat(
            this.formData.get('prb_service_cache').value
        ); // ค่าบริการ
        const prbValue5 = parseFloat(
            (prbValue1 + prbValue2 + prbValue3).toFixed(2)
        ); // ยอดสุทธิ

        this.formData_ActPeriod.patchValue({
            periodrange: newPeriod,
            date_end_prb: this.dateSuperFormat(
                this.addDaysToDate(startDate, newPeriod)
            ),

            prb_value1: prbValue1,
            stamp_prb: prbValue2,
            tax_prb: prbValue3,
            amount_paid_prb: prbValue1 + prbValue2 + prbValue3, // คิดเบี้ย + อากรแสตมป์ + ภาษีมูลค่าเพิ่ม

            prb_value4: 0,
            prb_value5: prbValue5,
        });

        this.isAdjustingValue = false;
    }

    /**
     *
     * @function สำหรับการ patch ค่าชุดข้อมูลคำนวณจาก ActPeriod (พ.ร.บ. > ระยะคุ้มครอง พ.ร.บ.)
     */
    pushActPeriod(): void {
        const constanceForm = this.formData_ActPeriod.value;
        this.formData.patchValue({ ...constanceForm });
        if (!isNaN(constanceForm.prb_value5))
            this.servicesFormArray
                .at(1)
                .get('service_price')
                .setValue(parseFloat(constanceForm.prb_value5.toFixed(2)));
        this.closeDialog(this.actPeriodRef);
    }
    /**
     *
     * @function ส่วนสำหรับป้องกันการคำนวนค่าที่เป็น null หรือ undefined
     */
    private incDeciActPeriod(): void {
        const prb5Pointer = parseFloat(
            this.formData_ActPeriod.value.prb_value5.toFixed(2)
        );
        if (!isNaN(prb5Pointer)) {
            this.formData_ActPeriod
                .get('prb_value5')
                .patchValue(Math.ceil(prb5Pointer));
        }
    }
    private decDeciActPeriod(): void {
        const prb5Pointer = parseFloat(
            this.formData_ActPeriod.value.prb_value5.toFixed(2)
        );
        if (!isNaN(prb5Pointer)) {
            this.formData_ActPeriod
                .get('prb_value5')
                .patchValue(Math.floor(prb5Pointer));
        }
    }
    private onServiceChargeChange(event: any) {
        const prb_value4 = parseFloat(
            this.formData.get('prb_service_cache').value
        );
        if (event.checked) {
            this.formData_ActPeriod.get('prb_value4').patchValue(prb_value4);
        } else {
            this.formData_ActPeriod.get('prb_value4').patchValue(0);
        }

        const prbValue1 = parseFloat(this.formData_ActPeriod.value.prb_value1); // คิดเบี้ย
        const prbValue2 = parseFloat(this.formData_ActPeriod.value.stamp_prb); // อากรแสตมป์
        const prbValue3 = parseFloat(this.formData_ActPeriod.value.tax_prb); // ภาษีมูลค่าเพิ่ม (7%) (คิดเบี้ย + อากรแสตมป์)
        const prbValue4 = parseFloat(this.formData_ActPeriod.value.prb_value4); // ค่าบริการ

        const prbValue5 = parseFloat(
            (prbValue1 + prbValue2 + prbValue3 + prbValue4).toFixed(2)
        ); // ยอดสุทธิ
        this.formData_ActPeriod.patchValue({
            prb_value5: prbValue5,
        });
    }

    /**
     *
     * @function ชุดฟังก์ชันสำหรับการคำนวณ/แก้ไขวันที่
     * @function ฟังก์ชันสำหรับปรับ format วันที่ให้เป็นรูปแบบมาตรฐาน
     * @param date วันที่เป้าหมายที่ต้องการใช้คำนวณ
     * @param days จำนวนวันที่จะเพิ่มเข้าไปยังวันที่เป้าหมาย
     * @param years จำนวนปีจะเพิ่มเข้าไปยังวันที่เป้าหมาย
     * @returns ค่าวันที่ที่ผ่านการคำนวณเสร็จสิ้น
     */
    private addDaysToDate(date: Date, days: number): Date {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
    private addYearsToDate(date: Date, years: number): Date {
        const result = new Date(date);
        result.setFullYear(result.getFullYear() + years);
        return result;
    }
    private getDaysDifference(date1: Date, date2: Date): number {
        const oneDayInMilliseconds = 24 * 60 * 60 * 1000; // จำนวนมิลลิวินาทีในหนึ่งวัน
        const differenceInMilliseconds = Math.abs(
            date2.getTime() - date1.getTime()
        ); // หาค่าความแตกต่างในมิลลิวินาที
        return Math.ceil(differenceInMilliseconds / oneDayInMilliseconds); // แปลงมิลลิวินาทีเป็นจำนวนวัน
    }
    private dateSuperFormat(date: any): string {
        return new Date(date).toISOString().split('T')[0];
    }

    /** LackOfTax */
    /**
     *
     * @param year จำนวนปี สำหรับตั้งค่าสำเร็จรูปเพื่อตั้งค่าจำนวนปีของ'กรณีขาดต่อภาษี'
     */
    lackOfTaxYear(year: number): void {
        const nowTaxDate = new Date(this.formData.get('tax_due_date').value);
        nowTaxDate.setFullYear(year - 543);

        this.formData
            .get('tax_due_date')
            .patchValue(nowTaxDate.toISOString().split('T')[0]);
    }

    lackofTaxCheck: boolean = true;
    /**
     *
     * @param isChecked สถานะการ check ใน'กรณีขาดต่อภาษี' ใช้สำหรับรีเฟรชการแสดงผลผลรวมของ'ภาษี'และ'ค่าปรับ'
     *  **รวมไปถึงการแสดงผลแบบมีตัวแสดงผลหลักพันและทศนิยมสองตำแหน่ง
     */
    calLackofTax(isChecked: boolean): void {
        let { lackSum, lackTax, lackFine } = this.dataRow2
            .slice(0, this.dataRow2.length - 1)
            .reduce(
                (acc, item) => {
                    acc.lackSum +=
                        (parseFloat(item.total.replace(/,/g, '')) || 0) +
                        (parseFloat(item.tax_fines.replace(/,/g, '')) || 0);
                    acc.lackTax +=
                        parseFloat(item.total.replace(/,/g, '')) || 0;
                    acc.lackFine +=
                        parseFloat(item.tax_fines.replace(/,/g, '')) || 0;
                    return acc;
                },
                { lackSum: 0, lackTax: 0, lackFine: 0 }
            );

        if (isChecked && this.dataRow2.length > 0) {
            const lastItem = this.dataRow2[this.dataRow2.length - 1];
            lackSum +=
                (parseFloat(lastItem.total.replace(/,/g, '')) || 0) +
                (parseFloat(lastItem.tax_fines.replace(/,/g, '')) || 0);
            lackTax += parseFloat(lastItem.total.replace(/,/g, '')) || 0;
            lackFine += parseFloat(lastItem.tax_fines.replace(/,/g, '')) || 0;
        }

        this.formData.patchValue({
            lackoftax_sum: lackSum,
            lackoftax_tax: lackTax,
            lackoftax_fine: lackFine,
        });

        this.lackofTaxCheck = isChecked;
    }

    /**
     *
     * @function สำหรับการ patch ค่าชุดข้อมูลคำนวณจาก ActPeriod (พ.ร.บ. > ระยะคุ้มครอง พ.ร.บ.)
     * @returns *เมื่อไม่มีข้อมูลที่ต้องทำการ patch
     */
    pushLackofTax(): void {
        if (this.dataRow2?.length == 0) {
            this.closeDialog(this.lackOfTaxRef);
            return;
        }

        this.servicesFormArray
            .at(2)
            .get('service_price')
            .setValue(
                parseFloat(
                    (this.formData.get('lackoftax_tax')?.value || 0).toFixed(2)
                )
            );
        this.servicesFormArray
            .at(3)
            .get('service_price')
            .setValue(
                parseFloat(
                    (this.formData.get('lackoftax_fine')?.value || 0).toFixed(2)
                )
            );
        this.closeDialog(this.lackOfTaxRef);
    }
    private incDeciLackOfTax(): void {
        const lackOfTaxTax = parseFloat(
            (this.formData.get('lackoftax_tax')?.value || 0).toFixed(2)
        );
        const lackOfTaxFine = parseFloat(
            (this.formData.get('lackoftax_fine')?.value || 0).toFixed(2)
        );
        this.formData.get('lackoftax_tax').patchValue(Math.ceil(lackOfTaxTax));
        this.formData
            .get('lackoftax_fine')
            .patchValue(Math.ceil(lackOfTaxFine));
    }
    private decDeciLackOfTax(): void {
        const lackOfTaxTax = parseFloat(
            (this.formData.get('lackoftax_tax')?.value || 0).toFixed(2)
        );
        const lackOfTaxFine = parseFloat(
            (this.formData.get('lackoftax_fine')?.value || 0).toFixed(2)
        );
        this.formData.get('lackoftax_tax').patchValue(Math.floor(lackOfTaxTax));
        this.formData
            .get('lackoftax_fine')
            .patchValue(Math.floor(lackOfTaxFine));
    }

    /** InsurData */
    /**
     *
     * @function สำหรับการรับค่าวันที่ปัจจุบันเพื่อใช้กับ'วันที่เริ่มต้น'ใน InsurData (ประกัน > ระยะคุ้มครอง พ.ร.บ.)
     */
    getNowDate1(): void {
        this.formData_InsurData
            .get('date_start')
            .patchValue(new Date().toISOString().split('T')[0]);
    }

    /**
     *
     * @function สำหรับการรับค่าวันที่ปัจจุบันเพื่อใช้กับ'วันที่เริ่มต้น'ใน InsurData (ประกัน > ระยะคุ้มครอง พ.ร.บ.)
     * @param year จำนวนปี สำหรับตั้งค่าสำเร็จรูปเพื่อเพิ่มส่วนต่างปีระหว่างวันที่เริ่มต้นและวันที่สิ้นสุดของ InsurData (ประกัน > ระยะคุ้มครอง พ.ร.บ.)
     */
    setEndDate1(year: number): void {
        if (this.formData_InsurData.get('date_start').value == '') {
            this.getNowDate();
        }
        const startDate = this.formData_InsurData.get('date_start').value;
        const endDate = this.addYearsToDate(startDate, year);
        this.formData_InsurData.patchValue({
            date_end: this.dateSuperFormat(endDate),
        });
    }

    /**
     *
     * @function สำหรับการ patch ค่าชุดข้อมูลจาก InsurData (ประกัน > ระยะคุ้มครอง พ.ร.บ.)
     */
    pushInsurData(): void {
        this.formData.patchValue({ ...this.formData_InsurData.value });
        this.closeDialog(this.insurDataRef);
    }

    // #endregion
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // #region utility

    /**
     *
     * @function สำหรับการคำนวนผลรวมค่าบริการจาก'ค่าบริการ'แล้วทำการ patch
     */
    private sumTotal(): void {
        let total = 0;
        let total_vat = 0;
        let total_nonvat = 0;

        this.servicesFormArray.controls.forEach((control: FormGroup) => {
            const status = control.get('status').value;
            const is_vat: boolean = control.get('is_vat').value;
            let price = control.get('service_price').value;

            if (typeof price === 'string') {
                price = parseFloat(price.replace(/,/g, ''));
            }
            if (status === 1 && !isNaN(price)) {
                total += price;
            }

            if (status === 1 && is_vat) {
                total_vat += price;
            } else if (status === 1 && !is_vat) {
                total_nonvat += price;
            }
        });

        this.formData.patchValue({
            total: total.toFixed(2),
            total_vat: total_vat.toFixed(2),
            total_nonvat: total_nonvat.toFixed(2),
        });
    }

    /**
     *
     * @function สำหรับปรับวันที่แบบเฉพาะจุดให้เป็นรูปแบบ'ปี-เดือน-วัน'
     */
    formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = ('0' + (date.getMonth() + 1)).slice(-2);
        const day = ('0' + date.getDate()).slice(-2);

        return `${year}-${month}-${day}`;
    }

    /**
     *
     * @function สำหรับการจัดการทศนิยมของ'ยอดชำระรวม'ด้วย mat-slide-toggle ใน paidType (ข้อมูลการชำระ)
     */
    toggleDiscount(event: MatSlideToggleChange): void {
        const totalValue = Number(this.formData.get('total')?.value) || 0;
        const discountValue = Number(this.formData.get('discount')?.value) || 0;
        const formTotal = parseFloat(totalValue.toFixed(2));
        const formDiscount = parseFloat(discountValue.toFixed(2));
        const integerPart = Math.trunc(formTotal);
        const decimalPart = parseFloat((formTotal - integerPart).toFixed(2));

        if (event.checked) {
            this.formData.patchValue({ discount: formDiscount + decimalPart });
        } else {
            const newDiscount = formDiscount - decimalPart;
            this.formData.patchValue({
                discount: newDiscount >= 0 ? newDiscount : 0,
            });
        }
    }

    /**
     *
     * @function สำหรับตั้งค่ายอดเงินที่ต้องการชำระในปัจจุบันให้เท่ากับยอดสุทธิทันที
     */
    setNowToLast() {
        const total_vatcal = Number(
            this.formData.get('total_vatcal').value || 0
        );
        const total_nonvatcal = Number(
            this.formData.get('total_nonvatcal').value || 0
        );
        this.formData.patchValue({
            now_paid: parseFloat(total_nonvatcal.toFixed(2)),
        });
        this.formData.patchValue({
            now_paid_vat: parseFloat(total_vatcal.toFixed(2)),
        });
    }

    /**
     *
     * @param event activities ที่เกิดขึ้นใน slot ค่าบริการ
     *  **ภายในฟังก์ชันเป็นการใช้งานค่า value ที่แนบมากับ event
     * @param index ตำแหน่งของ'ค่าบริการ'บน array
     *  **หมายเหตุ: ถูกยกเลิกใน commit 23c0835**
     */
    onInput(event: any, index: number) {
        let input = event.target.value;

        // ลบอักขระที่ไม่ใช่ตัวเลขหรือจุดทศนิยมออก
        input = input.replace(/[^0-9.]/g, '');

        // ตรวจสอบจุดทศนิยมไม่เกิน 1 จุด
        const decimalCount = (input.match(/\./g) || []).length;
        if (decimalCount > 1) {
            input = input.substring(0, input.length - 1);
        }

        // ตรวจสอบถ้าเริ่มด้วยจุดทศนิยม
        if (input.startsWith('.')) {
            input = '0' + input;
        }

        // จำกัดทศนิยมไม่เกิน 2 ตำแหน่ง
        const [integerPart, decimalPart] = input.split('.');
        if (decimalPart && decimalPart.length > 2) {
            input = `${integerPart}.${decimalPart.substring(0, 2)}`;
        }

        // ใส่คอมม่ากับจำนวนเต็ม
        const parts = input.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        const formattedValue = parts.join('.');

        // เก็บค่าดิบ (ไม่มีคอมม่า) ใน FormControl
        const rawValue = input.replace(/,/g, '');
        this.servicesFormArray
            .at(index)
            .get('service_price')
            ?.setValue(rawValue, { emitEvent: false });

        // แสดงค่าที่ฟอร์แมตแล้วใน input
        event.target.value = formattedValue;
    }

    /**
     *
     * @param event activities ที่เกิดขึ้นใน slot ใด ๆ ที่ผู้ใช้สามารถพิมพ์ได้
     * @event คืนผลลัพธ์โดยตรงไปยังตัวแปรต้นทางโดยขึ้นกับเงื่อนไขในฟังก์ชัน
     */
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

    /**
     *
     * @function สำหรับปรับแก้การแสดงผล slot ที่เป็น <autocomplete> กรณีที่มีการแสดงผลไม่ถูกต้อง
     * @param customer 'ชุด'ข้อมูลที่รับผ่าน slot ที่เป็น <autocomplete>
     * @returns ข้อมูลย่อยที่ระบุในฟังก์ชันจากชุดข้อมูล
     */
    displayFn(customer: any): string {
        return customer.no;
    }
    /**
     *
     * @function ส่วนสนับสนุนการ patch ข้อมูลด้วยข้อมูลย่อยของ slot ที่เป็น <autocomplete> กรณีที่มีการแสดงผลไม่ถูกต้อง
     * @param selectedCustomer 'ชุด'ข้อมูลที่รับผ่าน slot ที่เป็น <autocomplete>
     */
    patcher(selectedCustomer: any): void {
        this.formData.get('agent_id').patchValue(selectedCustomer.id);
    }

    /**
     *
     * @function ชุดฟังก์ชันสำหรับตรวจสอบสิทธิ์ในการดำเนินการลบ/แก้ไข
     * @returns ผลลัพธ์การตรวจสอบสิทธิ์
     *  **ตรวจสอบข้อมูลเพิ่มเติมใน'โครงสร้างองค์กร > ข้อมูลบริษัท > ตั้งค่าสิทธิ์ของตำแหน่ง'
     */
    showEdit(): boolean {
        return this._US.hasPermission(1);
    }
    showDelete(): boolean {
        return this._US.hasPermission(1);
    }

    showFlashMessage(type: 'success' | 'error'): void {
        this._US.showFlashMessage(type, this._changeDetectorRef, this);
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

    /** Date format (moment to json) */
    /**
     *
     * @function ชุดฟังก์ชันสำหรับปรับโครงสร้างวันที่ในกรณีที่มีการใช้ mat-datepicker/ mat-datepicker-toggle
     * @param event data จาก mat-datepicker/ mat-datepicker-toggle
     * @param controlName ชื่อของ'ตัวแปร'ใน form ที่ต้องการเก็บข้อมูล
     * @param formName ชื่อของ form ที่ต้องการเก็บข้อมูล
     *  **เนื่องจากเป็นฟังก์ชัน dynamic จึงต้องระบุว่าจะแก้ไขตัวแปรใดใน form ใด
     */
    onDateChange(event: any, controlName: string, formName: FormGroup): void {
        this._US.onDateChange(event, controlName, formName);
    }
    onDateInput(event: any): void {
        this._US.onDateInput(event);
    }

    // #endregion
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // #region customer_car

    private isBrandSelected: boolean = true;
    private isGasAdded: boolean = true;
    private dialogWidth: number = 90; // scale in %

    @ViewChild('Dialog') Dialog: TemplateRef<any>;
    @ViewChild('HullDialog') HullDialog: TemplateRef<any>;

    // Lists containing data used for dropdowns or select options in the form
    private listProvinces_CusCar: any[] = [];
    private listInspection_CusCar: any[] = [];
    private listInsurance_CusCar: any[] = [];
    private listBrands_CusCar: any[] = [];
    private listModels_CusCar: any[] = [];

    /**
     *
     * @function ใช้เรียกโมเดลรถหลังจากเลือกแบรนด์รถ
     */
    onBrandChange(): void {
        this.formData_CusCar.patchValue({ model_id: '' });
        this.isBrandSelected = this.formData_CusCar.value.brand_id !== '';

        if (this.isBrandSelected) {
            this._Service
                .getFilterModel(this.formData_CusCar.value.brand_id)
                .subscribe(
                    (resp) =>
                        (this.listModels_CusCar = resp.vehicle_models || [])
                );
        }
    }

    /**
     *
     * @get ใช้เรียกใช้กลุ่ม array ของถัง
     * @function เพิ่ม/ลบจำนวนถังบน array'เพิ่มข้อมูลตัวถัง'
     */
    get gas(): FormArray {
        return this.formGas_Add.get('gas') as FormArray;
    }
    addGroup(): void {
        const group = this._formBuilder.group({
            vehicle_id: [''],
            gas_type: [''],
            gas_position: [''],
            gas_model: [''],
            gas_brand: [''],
            gas_number: [''],
            gas_weight: [''],
            gas_thick: [''],
            gas_capacity: [''],
            gas_create: [''],
            gas_expire: [''],
        });
        this.gas.push(group);
    }
    removeGroup(index: number): void {
        this.gas.removeAt(index);
    }

    /**
     *
     * @function อัพเดทข้อมูลทั้งหมดใน'ข้อมูลรถ'รวมถึงข้อมูลตัวถังทั้งหมดด้วย
     */
    update_CasCar(): void {
        this._US.confirmAction(
            'แก้ไขรายการ',
            'คุณต้องการแก้ไขรายการใช่หรือไม่',
            this._fuseConfirm,
            () => {
                this._Service
                    .update_CasCar(
                        this.formData_CusCar.value,
                        this.cusCarGasCache?.id
                    )
                    .subscribe({
                        next: (resp) => {
                            this.updateResp = resp;

                            if (this.isGasAdded) {
                                this.cleanGasForm();
                                this.patchVehicleId();
                                this.createGas();
                                this.clearAllGas();
                            }
                            // this.rerender();
                            // this.closeDialog(this.dialogRef1);
                        },
                        error: (err) => {
                            console.error('Error updating gas record:', err);
                        },
                    });
            }
        );
    }

    /**
     *
     * @param id id ของรถที่จัดการข้อมูลตัวถัง
     * @function เพิ่ม/แก้ไข/ลบตัวถัง
     */
    createGas(id?: number): void {
        const gasData = this.formGas_Add.value.gas.map((gas: any) => ({
            vehicle_id: gas.vehicle_id || this.cusCarGasCache.id,
            gas_type: gas.gas_type,
            gas_position: gas.gas_position,
            gas_model: gas.gas_model,
            gas_brand: gas.gas_brand,
            gas_number: gas.gas_number,
            gas_weight: gas.gas_weight,
            gas_thick: gas.gas_thick,
            gas_capacity: gas.gas_capacity,
            // gas_create: gas.gas_create,
            // gas_expire: gas.gas_expireม
            gas_create: this._US.pdfDateFormat(gas.gas_create),
            gas_expire: this._US.pdfDateFormat(gas.gas_expire),
        }));

        const payload = { gas: gasData };

        this._Service.createGas(payload).subscribe(
            (response) => {
                // this.closeDialog(this.addGasDialogRef)
                this.loadGasData(this.cusCarGasCache.id);
                // this.closeDialog(this.addGasDialogRef);
            },
            (error) => {
                console.error('Error saving gas data', error);
            }
        );
    }

    updateGas(): void {
        this._US.confirmAction(
            'แก้ไขรายการ',
            'คุณต้องการแก้ไขรายการใช่หรือไม่',
            this._fuseConfirm,
            () => {
                this._Service
                    .updateGas(this.formGas_Edit.value, this.gasEditCache.id)
                    .subscribe({
                        complete: () => {
                            this.loadGasData(this.cusCarGasCache.id);
                            this.closeDialog(this.cusCarGasRef);
                        },
                        error: (err) => {
                            console.error('Error updating gas record:', err);
                        },
                    });
            }
        );
    }
    deleteGas(id: any): void {
        this._US.confirmAction(
            'ลบรายการที่เลือก',
            'คุณต้องการลบรายการที่เลือกใช่หรือไม่',
            this._fuseConfirm,
            () => {
                this._Service.delete_gas(id).subscribe({
                    complete: () => {
                        this.loadGasData(this.cusCarGasCache.id);
                    },
                    error: (err) => {
                        console.error('Error deleting gas record:', err);
                    },
                });
            }
        );
    }
    /**
     *
     * @param id_main id รถสำหรับเรียกข้อมูลตัวถังบนตารางอีกครั้งเนื่องจาก rerender ไม่ทำงานบน dialog
     */
    private loadGasData(id_main: any): void {
        this._Service.getGasByID(id_main).subscribe({
            next: (data) => {
                this.formData_CusCar.patchValue({ vehicle_gas: data });
            },
            error: (err) => {
                console.error('Error loading vehicle gas data:', err);
            },
        });
    }

    /**
     *
     * @function เคลียร์ array'ตัวถัง'ที่ไม่ได้ใส่ข้อมูล
     */
    private cleanGasForm(): void {
        // Iterate over the FormArray in reverse to safely remove items while iterating
        for (let i = this.gas.length - 1; i >= 0; i--) {
            // Check if any field in the group has a non-empty value
            const group = this.gas.at(i) as FormGroup;
            const hasValue = Object.values(group.controls).some(
                (control) => control.value && control.value.trim() !== ''
            );

            hasValue ? (this.isGasAdded = true) : this.gas.removeAt(i); // Remove the group if no field has a value
        }
    }
    private clearAllGas(): void {
        for (let i = this.gas.length - 1; i >= 0; i--) {
            this.gas.removeAt(i);
        }
        this.isGasAdded = false;
        this.addGroup();
    }
    private patchVehicleId(id?: number): void {
        this.gas.controls.forEach((group: FormGroup) => {
            group.patchValue({
                vehicle_id: id ? id : this.cusCarGasCache.id,
            });
        });
    }

    getGasCreatePickerId(index: number): string {
        return `gasCreatePicker${index}`;
    }
    getGasExpirePickerId(index: number): string {
        return `gasExpirePicker${index}`;
    }

    /* Dialog Operations */
    cusCarGasRef: MatDialogRef<any> | undefined;
    cusCarGasCache: any;

    async forceCall(id: string): Promise<void> {
        try {
            const resp = await lastValueFrom(
                this._Service.getVehicle_CusCar(id)
            );
            const respModel = await lastValueFrom(
                this._Service.getFilterModel(resp.data?.brand_id || '')
            );
            this.listModels_CusCar = respModel?.vehicle_models || [];

            this.formData_CusCar.patchValue({ ...resp.data });
        } catch (error) {
            console.error('Error fetching data:', error); // handle error
        }
    }
    gasEditCache: any;
    openGasEdit(item: any): void {
        this.formGas_Edit.patchValue(item);
        this.gasEditCache = item;
        this.cusCarGasRef = this._US.openDialog(
            this._matDialog,
            this.HullDialog,
            this.dialogWidth,
            this.formGas_Edit
        );
    }

    openAddGasDialog(): void {
        this.formGas_Add.reset();
        this.addGasDialogRef = this._matDialog.open(this.AddGasDialog, {
            width: this.reduceScreen ? '90%' : '40%',
        });
        this.trackBackdropClick(this.addGasDialogRef);
    }

    // #endregion
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // #region customer_data

    private cusDataAddressDialog: boolean = false;

    update_CusData(): void {
        // this._US.updateItem(this.formData, this._Service, this._fuseConfirm, this.submitForm.bind(this), this.updateResp);
        this._Service
            .updateCus(this.formData_CusData.value, this.formData_CusData.value.id)
            .subscribe({
                next: (resp) => {
                    this.updateResp = resp;
                    this.formAddress_CusData.patchValue({
                        customer_id: this.formData_CusData.value.id,
                    });
                    // this._Service
                    //     .updateCusAddress(
                    //         this.formAddress_CusData.value,
                    //         this.formData_CusData.value.id
                    //     )
                    //     .subscribe({
                    //         next: (resp) => {},
                    //         error: (error) => { },
                    //     });
                },
                error: (error) => { },
            });
        // this.closeDialog();
        // this.rerender();
    }

    // Dialog Operations
    public addressCusDataRef: MatDialogRef<any> | undefined;
    openAddress_CusData(keyinject?: number): void {
        if (keyinject) {
            this.cusDataAddressDialog = true;
        }
        this.addressCusDataRef = this._matDialog.open(this.AddressDialog, {
            width: this.reduceScreen ? '90%' : '40%',
        });
    }

    clearAddress(): void {
        Object.keys(this.formData_CusData.controls).forEach((key) => {
            this.formData_CusData.get(key)?.patchValue('');
        });
    }

    saveAddress_CusData(): void {
        const address = this.formAddress_CusData.value;
        this.formData_CusData.patchValue({
            address: `${address.address} ${address.subdistricts} ${address.districts} ${address.province}  ${address.zip_code}`,
        });
        this.closeDialog(this.addressCusDataRef);
    }

    // #endregion
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // #region CarCheck

    update_CarCheck(): void {
        this._US.confirmAction(
            'แก้ไขรายการ',
            'คุณต้องการแก้ไขรายการใช่หรือไม่',
            this._fuseConfirm,
            () => {
                this._Service
                    .update_CarCheck(
                        this.formData_CarCheck.value,
                        this.formData_CarCheck.value.id
                    )
                    .subscribe({
                        next: (resp) => { },
                        error: (err) => { },
                    });
            }
        );
    }

    setStateCarCheck(keyState?: number): void {
        keyState
            ? this.formData_CarCheck.get('result').patchValue('ผ่าน')
            : this.formData_CarCheck.get('result').patchValue('ไม่ผ่าน');
    }

    // #endregion
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // #region PDF export

    printPDF1(id: any) {
        window.open(`${environment.API_URL}/api/license/${id}`);
    }
    printPDF2(id: any) {
        window.open(`${environment.API_URL}/api/license_image/${id}`);
    }
    // printPDF3(id: any) { window.open(`${environment.API_URL}/api/report/ListPDFcheck_testLPG/${id}`); }
    printPDF3(id: any) {
        const url = `${environment.API_URL}/api/report/ListPDFcheck_testLPG/${id}`;

        // เปิดเอกสารผ่าน window.open
        const pdfWindow = window.open(url);

        // ตรวจสอบว่าหน้าใหม่เปิดสำเร็จหรือไม่
        if (pdfWindow) {
            // ตั้งเวลาเพื่อตรวจสอบการเปิดเอกสาร
            setTimeout(() => {
                // ถ้าเอกสารไม่ถูกโหลด จะถูก redirect มาที่ URL ของหน้า "Data Not Found"
                if (
                    pdfWindow.location.href.includes('Data Not Found') ||
                    pdfWindow.closed
                ) {
                    this.handleApiError({
                        error: { message: 'เอกสารไม่พบหรือเปิดไม่สำเร็จ' },
                    });
                    pdfWindow.close(); // ปิดหน้าใหม่ที่เปิดไม่สำเร็จ
                }
            }, 2000); // กำหนดเวลาตรวจสอบการเปิดเอกสาร
        } else {
            this.handleApiError({
                error: { message: 'ไม่สามารถเปิดเอกสารได้' },
            });
        }
    }

    printPDF4(id: any) {
        window.open(
            `${environment.API_URL}/api/report/exportPDF/certificate/${id}`
        );
    }
    printPDF5(id: any) {
        window.open(`${environment.API_URL}/api/report/report_cng/${id}`);
    }
    printbillservice(id: any) {
        window.open(
            `${environment.API_URL}/api/report/exportPDF/billservice/${id}`
        );
    } //ใบเสร็จ
    printreceipt(id: number, id2: number) {
        window.open(
            `${environment.API_URL}/api/report/exportPDF/receipt/${id}?installments_id=${id2}`
        );
    } //ใบสำคัญรับเงิน

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
    printBillquotation(id: any) {
        window.open(
            `${environment.API_URL}/api/report/exportPDF/billquotation/${id}`
        );
    } //ใบวางบิล
    printquotation(id: any) {
        window.open(
            `${environment.API_URL}/api/report/exportPDF/Quotation/${id}`
        );
    } //ใบเสนอราคา
    printallreceipt(id: any) {
        window.open(
            `${environment.API_URL}/api/report/exportPDF/allreceipt/${id}`
        );
    } //ใบสำคัญรับเงินรวม

    // #endregion
    onCheckboxChangeWithholdingTax_prb(
        checked: boolean,
        percent: string
    ): void {
        const numericPercent = parseFloat(percent);
        if (!isNaN(numericPercent)) {
            this.updateWithholdingTax([2], checked, numericPercent);
        } else {
            console.error('Invalid percentage value');
        }
    }

    onCheckboxChangeWithholdingTax_insu(
        checked: boolean,
        percent: string
    ): void {
        const numericPercent = parseFloat(percent);
        if (!isNaN(numericPercent)) {
            this.updateWithholdingTax([7], checked, numericPercent);
        } else {
            console.error('Invalid percentage value');
        }
    }

    onCheckboxChangeWithholdingTax_tax(
        checked: boolean,
        percent: string
    ): void {
        const numericPercent = parseFloat(percent);
        if (!isNaN(numericPercent)) {
            this.updateWithholdingTax([5], checked, numericPercent);
        } else {
            console.error('Invalid percentage value');
        }
    }

    onCheckboxChangeWithholdingTax_gas(
        checked: boolean,
        percent: string
    ): void {
        const numericPercent = parseFloat(percent);
        if (!isNaN(numericPercent)) {
            this.updateWithholdingTax(
                [8, 9, 10, 11, 12],
                checked,
                numericPercent
            );
        } else {
            console.error('Invalid percentage value');
        }
    }

    private updateWithholdingTax(
        service_ids: any[],
        checked: boolean,
        percent: number
    ): void {
        const listServiceTran = this.formData.get(
            'List_service_tran'
        ) as FormArray;

        service_ids.forEach((service_id) => {
            const control = listServiceTran.controls.find(
                (control) => control.get('service_id')?.value === service_id
            );

            if (control) {
                if (checked) {
                    control.patchValue({ withholding_tax_percent: percent });
                } else {
                    control.patchValue({ withholding_tax_percent: null });
                }
            }
        });
    }

    private toggleVAT(id: number): void {
        const listServiceTran = this.formData.get(
            'List_service_tran'
        ) as FormArray;
        const service_id = id + 1;
        const control = listServiceTran.controls.find(
            (control) => control.get('service_id')?.value === service_id
        );

        if (control) {
            const currentVAT = control.get('is_vat')?.value;
            const newVAT = currentVAT === 1 ? 0 : 1;
            control.patchValue({ is_vat: newVAT });
        }
        this.sumTotal();
    }

    emsDialog() {
        const dialogRef = this._matDialog.open(EmsDialogComponent, {
            width: '70%',
            height: '90vh',
            data: {
                province: this.listProvinces,
            },
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result.data.type === 'later') {
                this.formData.patchValue({
                    ems_province_id: null,
                    ems_district_id: null,
                    ems_subdistrict_id: null,
                    ems_address: null,
                    ems_name: null,
                });
            } else if (result.data.type === 'same') {
                //
            } else if (result.data.type === 'new') {
                this.formData.patchValue({
                    ems_province_id: result.data.province_id,
                    ems_district_id: result.data.district_id,
                    ems_subdistrict_id: result.data.subdistrict_id,
                    ems_address: result.data.address,
                    ems_name: result.data.name,
                });
            }
        });
    }

    customerDialog(value: any) {
        const dialogRef = this._matDialog.open(CustomerDialogComponent, {
            width: '900px',
            height: '90vh',
            data: {
                type: value,
                province: this.listProvinces,
            },
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result && value === 'LIST' && result.customer?.id) {
                this._Service.getCustomerID(result.customer.id).subscribe((resp) => {
                    this.patchCustomerFromApi(resp.data, { openAddressDialog: true });
                });
            }
        });
    }

    clearActPeriodValues(): void {
        // รีเซ็ตตัวแปรภายในคอมโพเนนต์
        this.inspectRate = 0;
        this.stampRate = 0;

        // เคลียร์ค่าฟอร์ม ActPeriod
        this.formData.patchValue({
            periodrange: null,
            date_start_prb: null,
            date_end_prb: null,
            prb_value1: null,
            stamp_prb: null,
            tax_prb: null,
            amount_paid_prb: null,
            prb_value4: 0,
            prb_value5: null,
        });
    }

    clearTaxValues(): void {
        this.formData.patchValue({
            tax_vehicle: null,
            // เพิ่ม field อื่น ๆ ที่เกี่ยวกับภาษี ถ้ามี
        });
    }

    clearInsurValues(): void {
        this.formData.patchValue({
            insurance_types_id: null,
            insurance_company: null,
            insurance_no: null,
            insurance_expire: null,
            // เพิ่มตาม field ที่คุณใช้
        });
    }

    clearLPGValues(): void {
        this.formData.patchValue({
            lpg_checklist: null,
            lpg_expire: null,
            // เพิ่มตาม field ที่เกี่ยวข้อง
        });
    }

    clearNGVValues(): void {
        this.formData.patchValue({
            ngv_checklist: null,
            ngv_expire: null,
        });
    }

    /** เปิดช่องรายละเอียdเมื่อบริการ 14/15 ถูกเลือก หรือมีข้อความใน DB (โหลดบิล) */
    private syncRemarkFieldVisibility(billData?: {
        remark?: string | null;
        remark_transport?: string | null;
    }): void {
        const isServiceOn = (serviceId: number): boolean => {
            const ctrl = this.servicesFormArray.controls.find(
                (c) => Number(c.get('service_id')?.value) === serviceId
            );
            const st = ctrl?.get('status')?.value;
            return st === true || st === 1 || st === '1';
        };
        const hasText = (v: string | null | undefined) =>
            v != null && String(v).trim() !== '';

        // index 13 = งานทะเบียn (service 14) → remark_transport
        // index 14 = อืnๆ (service 15) → remark
        this.isOtherChecked =
            isServiceOn(14) || hasText(billData?.remark_transport);
        this.isOther2Checked =
            isServiceOn(15) || hasText(billData?.remark);
    }

    clearOtherValues(): void {
        this.formData.patchValue({
            remark_transport: '',
        });
    }

    clearOther2Values(): void {
        this.formData.patchValue({
            remark: '',
        });
    }

    clearEmsValues(): void {
        this.formData.patchValue({
            EMS: null,
            ems_tracking_no: null,
        });
    }

}
