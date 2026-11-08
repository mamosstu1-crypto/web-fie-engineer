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

    // Properties and ViewChilds
    public dtOptions1: DataTables.Settings = {};
    public dtOptions2: DataTables.Settings = {};
    public dataRow1: any[] = [];
    public dataRow2: any[] = [];
    public formData: FormGroup;
    // public formData: FormGroup;
    public createResp: any[] = [];
    public updateResp: any[] = [];
    public deleteResp: any[] = [];
    public flashMessage: 'success' | 'error' | null = null;
    public isLoading: boolean = false;
    public currentStart: number = 0;
    public pages1 = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    public pages2 = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    public isEdit: boolean = false;
    public dialogWidth: number = 80; // scale in %
    public selectedTabIndex: number;

    @ViewChildren(DataTableDirective) dtElements: QueryList<DataTableDirective>;
    @ViewChild(MatPaginator) _paginator: MatPaginator;
    @ViewChild('Dialog') Dialog: TemplateRef<any>;

    public listInspection: any[] = [];

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

        // this.formData = this._formDataFrame.createAddressForm();
        // this._formDataService.setFormGroup('formData', this.formData);
    }

    /* Lifecycle Hooks */
    @HostListener('window:resize', ['$event']) onResize(event: Event) { this.checkScreenSize(); }
    private checkScreenSize() { this.reduceScreen = window.innerWidth < 1280; }
    tabData
    // Lifecycle Hooks
    async ngOnInit(): Promise<void> {
        this._activatedRoute.queryParams.subscribe(params => this.start = params['start']);
        this.loadTable(0, 1);
        this.loadTable(1, 2);

        this._Service.getInspections().subscribe((resp) => { this.listInspection = resp; });

        /* autocomplete filter address */
        {
            this._Service.getProvinces().subscribe((resp) => { this.listProvinces = resp; });

            /* address field */
            {
                this.filteredProvinces = this.formData.get('province')?.valueChanges.pipe(
                    startWith(''),
                    map(value => this._filterList(this.listProvinces, value, 'name_th'))
                );

                this.formData.get('province')?.valueChanges.pipe(
                    startWith(''),
                    tap(() => {
                        if (this.isPatching) return;
                        this.formData.get('districts')?.setValue('');
                        this.formData.get('subdistricts')?.setValue('');
                        this.formData.get('province_id')?.setValue('');
                        this.listdistricts = [];
                        this.listSubDistricts = [];
                    }),
                    switchMap((provinceName) => {
                        if (this.isPatching) return of([]);
                        const selectedProvince = this.listProvinces.find((p) => p.name_th === provinceName);
                        const provinceId = selectedProvince?.id || null;

                        this.formData.get('province_id')?.setValue(provinceId);
                        if (provinceId) {
                            return this._Service.getDistricts(provinceId);
                        } else {
                            return of([]);
                        }
                    })
                ).subscribe((resp) => {
                    this.listdistricts = resp.districts || [];
                    this.filteredDistricts = this.formData.get('districts')?.valueChanges.pipe(
                        startWith(''),
                        map((value) => this._filterList(this.listdistricts, value, 'name_th'))
                    );
                });

                this.formData.get('districts')?.valueChanges.pipe(
                    startWith(''),
                    tap(() => {
                        if (this.isPatching) return;
                        this.formData.get('subdistricts')?.setValue('');
                        this.formData.get('district_id')?.setValue('');
                        this.listSubDistricts = [];
                    }),
                    switchMap((districtName) => {
                        if (this.isPatching) return of([]);
                        const selectedDistrict = this.listdistricts.find((d) => d.name_th === districtName);
                        const districtId = selectedDistrict?.id || null;

                        this.formData.get('district_id')?.setValue(districtId);
                        if (districtId) {
                            return this._Service.getSubDistricts(districtId);
                        } else {
                            return of([]);
                        }
                    })
                ).subscribe((resp) => {
                    this.listSubDistricts = resp.sub_districts || [];
                    this.filteredSubDistricts = this.formData.get('subdistricts')?.valueChanges.pipe(
                        startWith(''),
                        map((value) => this._filterList(this.listSubDistricts, value, 'name_th'))
                    );
                });

                this.formData.get('subdistricts')?.valueChanges.pipe(
                    startWith(''),
                    map((subdistrictName) => {
                        if (this.isPatching) return;
                        const selectedSubDistrict = this.listSubDistricts.find((s) => s.name_th === subdistrictName);
                        const subdistrictId = selectedSubDistrict?.id || null;

                        this.formData.get('subdistrict_id')?.setValue(subdistrictId);
                        if (selectedSubDistrict) {
                            this.formData.get('zip_code')?.setValue(selectedSubDistrict.zip_code);
                        } else {
                            this.formData.get('zip_code')?.setValue('');
                        }
                        return subdistrictName;
                    })
                ).subscribe();
            }
        }

        this.formData.get('startDate')?.valueChanges.subscribe(() => { this.rerender(); });
        this.formData.get('endDate')?.valueChanges.subscribe(() => { this.rerender(); });
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

    onTabChange():void {
    }

    // DataTable Initialization
    // loadTable(): void { this._US.loadTable(this, this._Service, this._changeDetectorRef, this.pages, this, this.start, this); }
    async loadTable(status: number, tableIndex: number): Promise<void> {
        const dtOptionsKey = `dtOptions${tableIndex}`;
        const pagesKey = `pages${tableIndex}`;

        this[dtOptionsKey] = {
            pagingType: 'full_numbers', pageLength: 10, order: [],
            displayStart: this.start, serverSide: true, processing: true, responsive: true,
            language: { url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/th.json' },
            ajax: (dataTablesParameters: any, callback) => {
                dataTablesParameters.branch_id = this.loginBranchId();
                this.currentStart = dataTablesParameters.start;
                dataTablesParameters.ems = status;
                dataTablesParameters.start_date = this.formData.get('startDate')?.value;
                dataTablesParameters.end_date = this.formData.get('endDate')?.value;

                const order = dataTablesParameters.order.length > 0
                    ? dataTablesParameters.order[0]
                    : { column: 0, dir: 'desc' };
                this._Service.getPage({ ...dataTablesParameters, order: [order] }).subscribe((resp) => {
                    this[`dataRow${tableIndex}`] = resp.data;
                    this[pagesKey].current_page = resp.current_page;
                    this[pagesKey].last_page = resp.last_page;
                    this[pagesKey].per_page = resp.per_page;

                    (resp.current_page > 1)
                        ? this[pagesKey].begin = resp.per_page * (resp.current_page - 1)
                        : this[pagesKey].begin = 0;

                    callback({
                        recordsTotal: resp.total,
                        recordsFiltered: resp.total,
                        data: [],
                    });
                    this._changeDetectorRef.markForCheck();
                });
            },
        };
    }

    // CRUD Operations
    // create(): void { this._US.createItem(this._Service, this._fuseConfirm, this.submitForm.bind(this), this.createResp); }
    private validateEmsForm(): boolean {
        this.formData.markAllAsTouched();
        return this.formData.valid;
    }

    create(): void {
        if (!this.validateEmsForm()) {
            return;
        }
        this._US.confirmAction('สร้างรายการใหม่', 'คุณต้องการสร้างรายการใหม่ใช่หรือไม่', this._fuseConfirm,
            () => {
                this._Service.create(this.formatForm()).subscribe({
                    next: (resp: any) => {
                        this.createResp = resp;
                        this.closeDialog();
                        this.rerender();
                    },
                    error: (error: any) => {
                        this._US.confirmAction('ข้อผิดพลาด', error.error.message, this._fuseConfirm,
                        () => {}, { showConfirm: false, showCancel: false, }
            )},});},
        );
    }
    // update(): void { this._US.updateItem(this.formData, this._Service, this._fuseConfirm, this.submitForm.bind(this), this.updateResp); }
    update(): void {
        if (!this.validateEmsForm()) {
            return;
        }
        this._US.confirmAction('แก้ไขรายการ', 'คุณต้องการแก้ไขรายการใช่หรือไม่', this._fuseConfirm,
            () => {
                this._Service.update(this.formatForm(), this.formData.get('id').value).subscribe({
                    next: (resp: any) => {
                        this.updateResp = resp;
                        this.closeDialog();
                        this.rerender();
                    },
                    error: (error: any) => {
                        this._US.confirmAction('ข้อผิดพลาด', error.error.message, this._fuseConfirm,
                        () => {}, { showConfirm: false, showCancel: false, }
            )},});},
        );
    }
    delete(id: any): void { this._US.deleteItem(id, this._Service, this._fuseConfirm, this.rerender.bind(this), this.deleteResp); }

    /* Date format (moment to json) */
    onDateChange(event: any, controlName: string, formName: FormGroup): void {
        this._US.onDateChange(event, controlName, formName);
    }
    onDateInput(event: any): void { this._US.onDateInput(event); }

    // Dialog Operations
    addressDialogRef: any;
    private isPatching = true;
    openDialog(item?: any, event?: Event): void {
        if (event) { event.stopPropagation(); }
        if (item) {
            this.isPatching = true;
            this.formData.patchValue({
                id:                 item.id,
                name:               item.name,
                no:                 item.no,
                ems:                item.ems,
                photo:              item.photo,

                inspection_id:      item.id,

                address:            item.address,
                province_id:        item.province_id,
                district_id:        item.district_id,
                subdistrict_id:     item.subdistrict_id,
                zip_code:           item.zip_code,

                province:           item.province_name,
                districts:          item.district_name,
                subdistricts:       item.sub_district_name,
            });

            this.isPatching = false;
            this.isEdit = true
        } else {
            this.isEdit = false;
        }
        this._US.openDialog(this._matDialog, this.Dialog, this.dialogWidth, this.formData);
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
        this.formData, action, this._changeDetectorRef, this._fuseConfirm, this, this.rerender.bind(this), this.closeDialog.bind(this)
    );}

    private loginBranchId(): string | number | null {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        return (user?.employees ?? user?.Employees)?.branch_id ?? null;
    }

    envelopeAddress(id: number): void {
        const branchId = this.loginBranchId() ?? '';
        window.open(
            `${environment.API_URL}/api/report/exportPDF/addresEms/${id}?branch_id=${branchId}`
        );
    }

    pdf() {
        const branch_id = this.loginBranchId();
        const startDate = this.formData.get('startDate')?.value || this._US.pdfDefaultDate('firstDayOfMonth');
        const endDate = this.formData.get('endDate')?.value || this._US.pdfDefaultDate('lastDayOfMonth');
        const formatSDate = this._US.pdfDateFormat(startDate);
        const formatEDate = this._US.pdfDateFormat(endDate);

        window.open(`${environment.API_URL}/api/report/exportPDF/EMS_report?start_date=${formatSDate}&end_date=${formatEDate}&branch_id=${branch_id}`, '_blank');
    }

    excel() {
        const branch_id = this.loginBranchId();
        const startDate =
            this.formData.get('startDate')?.value ||
            this._US.pdfDefaultDate('firstDayOfMonth');
        const endDate =
            this.formData.get('endDate')?.value ||
            this._US.pdfDefaultDate('lastDayOfMonth');
        const formatSDate = this._US.pdfDateFormat(startDate);
        const formatEDate = this._US.pdfDateFormat(endDate);

        window.open(
            `${environment.API_URL}/api/report/excel/EMS_report?start_date=${formatSDate}&end_date=${formatEDate}&branch_id=${branch_id}`,
            '_blank'
        );
    }

    files: File | null = null;
    imagePreview: string | null = null;
    onSelect(event: any) {
        this.files = event.addedFiles[0];

        const reader = new FileReader(); // แปลงไฟล์เป็น URL เพื่อแสดงใน <img>
        reader.onload = (e: any) => { this.imagePreview = e.target.result; };
        reader.readAsDataURL(this.files);
    }
    onRemove(event) {
        this.files = null;
        this.imagePreview = null;
    }

    private formatForm(): any {
        const formData = new FormData();
        Object.entries(this.formData.value).forEach(([key, value]: [string, any]) => {
            if (key !== 'photo') {
                formData.append(key, value);
            }
        });
        if (this.files) {
            formData.append('photo', this.files);
        } else if (this.formData.get('photo')?.value) {
            formData.append('photo', this.formData.get('photo')?.value);
        }
        return formData;
    }
}
