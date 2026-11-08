import { LOCALE_ID, Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ViewChildren,
    QueryList, TemplateRef, ChangeDetectorRef, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { DataTableDirective } from 'angular-datatables';
import { MatPaginator } from '@angular/material/paginator';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom, map, Observable, of, startWith, Subject, switchMap, tap } from 'rxjs';
import { fuseAnimations } from '@fuse/animations';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Service } from '../page.service';
import { UtilityService, DATE_TH_FORMATS, CustomDateAdapter } from 'app/app.utility-service';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { FormDataFrame } from './list.mainframe';
import { FormDataService } from 'app/modules/matdynamic/form-data.service';
import { environment } from 'environments/environment';
import { DataPosition, AssetType, Pagination } from '../page.types';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import moment from 'moment';

@Component({
    selector: 'list',
    templateUrl: './list.component.html',
    styleUrls: ['./list.component.scss'],
    providers: [
        { provide: DateAdapter, useClass: CustomDateAdapter },
        { provide: MAT_DATE_FORMATS, useValue: DATE_TH_FORMATS },
        { provide: LOCALE_ID, useValue: 'th-TH-u-ca-gregory' },
        { provide: MAT_DATE_LOCALE, useValue: 'th-TH' }
    ],
    animations: fuseAnimations,
})
export class ListComponent implements OnInit, AfterViewInit, OnDestroy {

    // #region COLLAPSEPOINT
    // Properties and ViewChilds
    public dtOptions: DataTables.Settings = {};
    public dataRow: any[] = [];
    public formData: FormGroup;
    public formData_address: FormGroup;
    public createResp: any[] = [];
    public updateResp: any[] = [];
    public deleteResp: any[] = [];
    public flashMessage: 'success' | 'error' | null = null;
    public isLoading: boolean = false;
    public currentStart: number = 0;
    public pages = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    public isEdit: boolean = false;
    public dialogWidth: number = 80; // scale in %

    @ViewChildren(DataTableDirective) dtElements: QueryList<DataTableDirective>;
    @ViewChild(MatPaginator) _paginator: MatPaginator;
    @ViewChild('Dialog') Dialog: TemplateRef<any>;
    @ViewChild('AddressDialog') AddressDialog: TemplateRef<any>;
    @ViewChild('ImageDialog') ImageDialog: TemplateRef<any>;

    /* GET partition data */
    public listProvinces: any[] = [];
    public listdistricts: any[] = [];
    public listSubDistricts: any[] = [];

    /* GET partition analyse */
    public filteredProvinces: Observable<string[]>;
    public filteredDistricts: Observable<string[]>;
    public filteredSubDistricts: Observable<string[]>;

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private start: number;
    public reduceScreen: boolean = false;
    // #endregion COLLAPSEPOINT

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseConfirm: FuseConfirmationService,
        private _formBuilder: FormBuilder,
        private _Service: Service,
        private _matDialog: MatDialog,
        private _activatedRoute: ActivatedRoute,
        private _formDataFrame: FormDataFrame,
        private _formDataService: FormDataService,
        private _US: UtilityService,
    ) {
        this.formData = this._formDataFrame.createMainForm();
        this._formDataService.setFormGroup('formData', this.formData);

        this.formData_address = this._formDataFrame.createAddressForm();
        this._formDataService.setFormGroup('formData_address', this.formData_address);

        this.formData.get('expiration_date').valueChanges.subscribe((value) => {
            const formattedDate = moment(value).format('YYYY-MM-DD');
            this.formData
                .get('expiration_date')
                .setValue(formattedDate, { emitEvent: false });
        });
    }

    /* Lifecycle Hooks */
    @HostListener('window:resize', ['$event']) onResize(event: Event) { this.checkScreenSize(); }
    private checkScreenSize() { this.reduceScreen = window.innerWidth < 1280; }

    // Lifecycle Hooks
    async ngOnInit(): Promise<void> {
        this._activatedRoute.queryParams.subscribe(params => this.start = params['start']);
        this.loadTable();

        /* autocomplete filter address */
        {
            this._Service.getProvinces().subscribe((resp) => { this.listProvinces = resp; });

            /* address field */
            {
                this.filteredProvinces = this.formData_address.get('province')?.valueChanges.pipe(
                    startWith(''), map(value => this._filterList(this.listProvinces, value, 'name_th'))
                );

                this.formData_address.get('province')?.valueChanges.pipe(
                    startWith(''), tap(() => {
                        this.formData_address.get('districts')?.setValue('');
                        this.formData_address.get('subdistricts')?.setValue('');
                        this.formData_address.get('province_id')?.setValue('');
                        this.listdistricts = [];
                        this.listSubDistricts = [];
                    }),
                    switchMap((provinceName) => {
                        const selectedProvince = this.listProvinces.find((p) => p.name_th === provinceName);
                        const provinceId = selectedProvince?.id || null;

                        this.formData_address.get('province_id')?.setValue(provinceId);
                        if (provinceId) {
                            return this._Service.getDistricts(provinceId);
                        } else { return of([]); }
                    })
                ).subscribe((resp) => {
                    this.listdistricts = resp.districts || [];
                    this.filteredDistricts = this.formData_address.get('districts')?.valueChanges.pipe(
                        startWith(''), map((value) => this._filterList(this.listdistricts, value, 'name_th'))
                    );
                });

                this.formData_address.get('districts')?.valueChanges.pipe(
                    startWith(''), tap(() => {
                        this.formData_address.get('subdistricts')?.setValue('');
                        this.formData_address.get('district_id')?.setValue('');
                        this.listSubDistricts = [];
                    }),
                    switchMap((districtName) => {
                        const selectedDistrict = this.listdistricts.find((d) => d.name_th === districtName);
                        const districtId = selectedDistrict?.id || null;

                        this.formData_address.get('district_id')?.setValue(districtId);
                        if (districtId) {
                            return this._Service.getSubDistricts(districtId);
                        } else { return of([]); }
                    })
                ).subscribe((resp) => {
                    this.listSubDistricts = resp.sub_districts || [];
                    this.filteredSubDistricts = this.formData_address.get('subdistricts')?.valueChanges.pipe(
                        startWith(''), map((value) => this._filterList(this.listSubDistricts, value, 'name_th'))
                    );
                });

                this.formData_address.get('subdistricts')?.valueChanges.pipe(
                    startWith(''), map((subdistrictName) => {
                        const selectedSubDistrict = this.listSubDistricts.find((s) => s.name_th === subdistrictName);
                        const subdistrictId = selectedSubDistrict?.id || null;

                        this.formData_address.get('subdistrict_id')?.setValue(subdistrictId);
                        if (selectedSubDistrict) {
                            this.formData_address.get('zip_code')?.setValue(selectedSubDistrict.zip_code);
                        } else { this.formData_address.get('zip_code')?.setValue(''); }
                        return subdistrictName;
                    })
                ).subscribe();
            }
        }
    }
    private _filterList(list: any[], value: string, key: string): any[] {
        const filterValue = value.toLowerCase();
        return list.filter(item => item[key].toLowerCase().includes(filterValue));
    }

    ngAfterViewInit(): void {}
    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    saveAddress(): void {
        const address = this.formData_address.value;
        this.formData.patchValue({
            address: `${address.address} ${address.subdistricts} ${address.districts} ${address.province}  ${address.zip_code}`,
            province_id: address.province_id,
            district_id: address.district_id,
            subDistrict_id: address.subdistrict_id,
            postal_code: address.zip_code,
        });
        this.closeDialog(this.addressDialogRef);
    }

    // DataTable Initialization
    loadTable(): void { this._US.loadTable(this, this._Service, this._changeDetectorRef, this.pages, this, this.start, this); }

    // CRUD Operations
    create(): void {
        this._US.confirmAction('สร้างรายการใหม่', 'คุณต้องการสร้างรายการใหม่ใช่หรือไม่', this._fuseConfirm,
            () => {
                this._Service.create(this.formatForm()).subscribe({
                    next: (resp: any) => { this.createResp = resp; this.closeDialog(); this.rerender(); },
                    error: (error: any) => {
                        this._US.confirmAction('ข้อผิดพลาด', error.error.message, this._fuseConfirm,
                        () => {}, { showConfirm: false, showCancel: false, }
            )},});},
        );
    }
    update(): void {
        this._US.confirmAction('แก้ไขรายการ', 'คุณต้องการแก้ไขรายการใช่หรือไม่', this._fuseConfirm,
            () => {
                this._Service.update(this.formatForm(), this.formData.get('id').value).subscribe({
                    next: (resp: any) => {
                        this.updateResp = resp;
                        this.files = null;
                        this.files_under = null;
                        this.closeDialog();
                        this.rerender();
                    },
                    error: (error: any) => {
                        this._US.confirmAction('ข้อผิดพลาด', error.error.message, this._fuseConfirm,
                        () => {}, { showConfirm: false, showCancel: false, }
            )},});},
        );
    }
    private formatForm(): any {
        const formData = new FormData();
        const skipKeys = new Set(['logo', 'logo_under', 'logo_url', 'logo_under_url']);
        Object.entries(this.formData.value).forEach(([key, value]: any[]) => {
            if (skipKeys.has(key) || value === null || value === undefined) {
                return;
            }
            formData.append(key, value);
        });
        if (this.files) {
            formData.append('logo', this.files);
        }
        if (this.files_under) {
            formData.append('logo_under', this.files_under);
        }
        return formData;
    }

    // create(): void { this._US.createItem(this._Service, this._fuseConfirm, this.submitForm.bind(this), this.createResp); }
    // update(): void { this._US.updateItem(this.formData, this._Service, this._fuseConfirm, this.submitForm.bind(this), this.updateResp); }
    delete(id: any): void { this._US.deleteItem(id, this._Service, this._fuseConfirm, this.rerender.bind(this), this.deleteResp); }

    files: File | null = null;
    files_under: File | null = null;
    imagePreview: string | null = null;
    imagePreview_under: string | null = null;

    // onSelect(event) { this.files.push(...event.addedFiles); setTimeout(() => { this._changeDetectorRef.detectChanges(); }, 150); }
    // onRemove(event) { this.files.splice(this.files.indexOf(event), 1); this.formData.patchValue({ image: '', }); }
    onSelect(event: any) {
        this.files = event.addedFiles[0];

        const reader = new FileReader(); // แปลงไฟล์เป็น URL เพื่อแสดงใน <img>
        reader.onload = (e: any) => { this.imagePreview = e.target.result; };
        reader.readAsDataURL(this.files);
    }
    onSelect_under(event: any) {
        this.files_under = event.addedFiles[0];

        const reader = new FileReader(); // แปลงไฟล์เป็น URL เพื่อแสดงใน <img>
        reader.onload = (e: any) => { this.imagePreview_under = e.target.result; };
        reader.readAsDataURL(this.files_under);
    }
    onRemove(event) {
        this.files = null;
    }

    // Dialog Operations
    dialogRef: any; addressDialogRef: any;
    openDialog(item?: any, event?: Event): void {
        if (event) { event.stopPropagation(); }
        this.files = null;
        this.files_under = null;
        this.imagePreview = null;
        this.imagePreview_under = null;
        if (item) {
            this._Service.getBracheID(item.id).subscribe((resp) => {
                this.formData.patchValue({ ...resp.data });
                this._changeDetectorRef.markForCheck();
            });
            this.isEdit = true;
        } else {
            this.isEdit = false;
        }
        this.dialogRef = this._US.openDialog(this._matDialog, this.Dialog, this.dialogWidth, this.formData);
    }
    openAddressDialog(): void {
        this.addressDialogRef = this._matDialog.open(this.AddressDialog, { width: (this.reduceScreen) ? '90%' : '40%', });
    }
    closeDialog(Ref?: any): void { (Ref) ? (this._US.closeDialog(Ref)) : (this._matDialog.closeAll()) }

    // Utility Methods
    rerender(): void { this.dtElements.forEach((dtElement: DataTableDirective) =>
        { dtElement.dtInstance.then((dtInstance: any) => dtInstance.ajax.reload()); });
    }
    showEdit(): boolean { return this._US.hasPermission(1); }
    showDelete(): boolean { return this._US.hasPermission(1); }
    showFlashMessage(type: 'success' | 'error'): void { this._US.showFlashMessage(type, this._changeDetectorRef, this); }

    private submitForm(action: (formData: FormData) => Observable<any>): void { this._US.submitForm(
        this.formatForm(), action, this._changeDetectorRef, this._fuseConfirm, this, this.rerender.bind(this), this.closeDialog.bind(this)
    );}
}
