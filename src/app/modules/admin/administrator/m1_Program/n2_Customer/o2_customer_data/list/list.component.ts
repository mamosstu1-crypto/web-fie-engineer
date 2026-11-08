import { LOCALE_ID, Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ViewChildren,
    QueryList, TemplateRef, ChangeDetectorRef, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router  } from '@angular/router';
import { lastValueFrom, map, Observable, of, startWith, Subject, switchMap, tap } from 'rxjs';
import { fuseAnimations } from '@fuse/animations';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Service } from '../page.service';
import { DataTableDirective } from 'angular-datatables';
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
    public dialogWidth: number = 40; // scale in %

    @ViewChildren(DataTableDirective) dtElements: QueryList<DataTableDirective>;
    @ViewChild(MatPaginator) _paginator: MatPaginator;
    @ViewChild('Dialog') Dialog: TemplateRef<any>;
    @ViewChild('AddressDialog') AddressDialog: TemplateRef<any>;

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
    private reduceScreen: boolean = false;

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
        private _router: Router,
    ) {
        this.formData = this._formDataFrame.createMainForm();
        this._formDataService.setFormGroup('formData', this.formData);

        this.formData_address = this._formDataFrame.createAddressForm();
        this._formDataService.setFormGroup('formData_address', this.formData_address);
    }

    // Lifecycle Hooks
    @HostListener('window:resize', ['$event']) onResize(event: Event) { this.checkScreenSize(); }
    private checkScreenSize() { this.reduceScreen = window.innerWidth < 1280; }

    async ngOnInit(): Promise<void> {
        this._activatedRoute.queryParams.subscribe(params => this.start = params['start']);
        this.loadTable();

        // this._Service.getEmployee().subscribe(resp => this.listEmployee = resp);

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

    // DataTable Initialization
    // loadTable(): void { this._US.loadTable(this, this._Service, this._changeDetectorRef, this.pages, this, this.start, this); }
    loadTable(): void {
        this.dtOptions = {
            pagingType: 'full_numbers', pageLength: 10, displayStart: this.start,
            serverSide: true, processing: true, responsive: true, order: [],
            language: { url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/th.json', },
            ajax: (dataTablesParameters: any, callback) => {
                dataTablesParameters.type = this.selectedStatus;
                this.currentStart = dataTablesParameters.start;

                const order = dataTablesParameters.order.length > 0
                    ? dataTablesParameters.order[0]
                    : { column: 0, dir: 'desc' };
                this._Service.getPage({ ...dataTablesParameters, order: [order] }).subscribe((resp) => {
                    this.dataRow = resp.data;
                    this.pages.current_page = resp.current_page;
                    this.pages.last_page = resp.last_page;
                    this.pages.per_page = resp.per_page;

                    (resp.current_page > 1)
                        ? this.pages.begin = resp.per_page * (resp.current_page - 1)
                        : this.pages.begin = 0;

                    callback({ recordsTotal: resp.total, recordsFiltered: resp.total, data: [] });
                    this._changeDetectorRef.markForCheck();
                });
            },
        };
    }

    // CRUD Operations
    dialogCache: any;
    create(): void {
        // this._US.createItem(this._Service, this._fuseConfirm, this.submitForm.bind(this), this.createResp)
        this._Service.create(this.formData.value).subscribe({
            next: (resp) => {
                this.createResp = resp;
                this.formData_address.patchValue({ customer_id: this.dialogCache.id })
                this._Service.createCusAddress(this.formData_address.value).subscribe({
                    next: (resp) => {},
                    error: error => { console.log(error); }
                });
            },
            error: error => { console.log(error); }
        });
        this.closeDialog();
        this.rerender();
    }
    update(): void {
        // this._US.updateItem(this.formData, this._Service, this._fuseConfirm, this.submitForm.bind(this), this.updateResp);
        this._Service.update(this.formData.value, this.dialogCache.id).subscribe({
            next: (resp) => {
                this.updateResp = resp;
                this.formData_address.patchValue({ customer_id: this.dialogCache.id })
                this._Service.updateCusAddress(this.formData_address.value, this.dialogCache.id).subscribe({
                    next: (resp) => {},
                    error: error => { console.log(error); }
                });
            },
            error: error => { console.log(error); }
        });
        this.closeDialog();
        this.rerender();
    }
    delete(id: any): void { this._US.deleteItem(id, this._Service, this._fuseConfirm, this.rerender.bind(this), this.deleteResp); }

    // Dialog Operations
    dialog: any; addressDialogRef: any;
    // openDialog(item?: any, event?: Event): void {
    //     if (event) { event.stopPropagation(); }
    //     item ? (this.formData.patchValue(item), this.dialogCache = item, this.isEdit = true) : (this.isEdit = false);
    //     this.dialog = this._US.openDialog(this._matDialog, this.Dialog, 90, this.formData);
    // }
    openDialog(id?: any): void {
        if(id) {
            this._router.navigate(['customer_data/list/address/' + id])
        }else{
            this._router.navigate(['customer_data/list/address'])
        }
    }

    openAddressDialog(): void {
        this.addressDialogRef = this._matDialog.open(this.AddressDialog, { width: (this.reduceScreen) ? '90%' : '40%', });
    }
    closeDialog(Ref?: any): void { (Ref) ? (this._US.closeDialog(Ref)) : (this._matDialog.closeAll()) }

    clearAddress(): void { Object.keys(this.formData.controls).forEach(key => { this.formData.get(key)?.patchValue(''); }); }

    saveAddress(): void {
        const address = this.formData_address.value;
        this.formData.patchValue({
            address: `${address.address} ${address.subdistricts} ${address.districts} ${address.province}  ${address.zip_code}`,
        });
        this.closeDialog(this.AddressDialog);
    }

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

    selectedStatus: string = '';
    onStatusChange(status: string): void {
        this.selectedStatus = status;
        this.rerender();
    }
    excel() {
        const startDate =
            this.formData.get('startDate')?.value ||
            this._US.pdfDefaultDate('firstDayOfMonth');
        const endDate =
            this.formData.get('endDate')?.value ||
            this._US.pdfDefaultDate('lastDayOfMonth');

        const formatSDate = this._US.pdfDateFormat(endDate);
        const type = this.selectedStatus;

        this._US.openPDF(
            `${environment.API_URL}/api/report/excel/exportExcel_customerreport?type=${type}`,
        );
    }
}
