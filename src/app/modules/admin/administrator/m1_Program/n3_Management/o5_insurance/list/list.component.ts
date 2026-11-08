import { LOCALE_ID, Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ViewChildren,
    QueryList, TemplateRef, ChangeDetectorRef, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { DataTableDirective } from 'angular-datatables';
import { MatPaginator } from '@angular/material/paginator';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, lastValueFrom, map, Observable, of, ReplaySubject, startWith, Subject, switchMap, takeUntil, tap } from 'rxjs';
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
    public formData_address: FormGroup;
    public createResp: any[] = [];
    public updateResp: any[] = [];
    public deleteResp: any[] = [];
    public flashMessage: 'success' | 'error' | null = null;
    public isLoading: boolean = false;
    public currentStart: number = 0;
    public pages1 = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    public pages2 = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    public isEdit: boolean = false;
    public dialogWidth: number = 60; // scale in %
    public selectedTabIndex: number;

    @ViewChildren(DataTableDirective) dtElements: QueryList<DataTableDirective>;
    @ViewChild(MatPaginator) _paginator: MatPaginator;
    @ViewChild('Dialog') Dialog: TemplateRef<any>;
    @ViewChild('AddressDialog') AddressDialog: TemplateRef<any>;

    /* GET partition data */
    public listProvinces: any[] = [];
    public listdistricts: any[] = [];
    public listSubDistricts: any[] = [];
    public listInsurRenewType: any[] = [];

    /* GET partition analyse */
    public filteredProvinces: Observable<string[]>;
    public filteredDistricts: Observable<string[]>;
    public filteredSubDistricts: Observable<string[]>;

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private start: number;
    public reduceScreen: boolean = false;

    insurance_nameFilter = new FormControl('');
    filterinsurance_name: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
    insurance_name: any[] = [];

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
        this.insurance_name = this._activatedRoute.snapshot.data.insurance_name.data;
        this.filterinsurance_name.next(this.insurance_name.slice());
    }

    /* Lifecycle Hooks */
    @HostListener('window:resize', ['$event']) onResize(event: Event) { this.checkScreenSize(); }
    private checkScreenSize() { this.reduceScreen = window.innerWidth < 1280; }
    protected _onDestroy = new Subject<void>();

    // Lifecycle Hooks
    async ngOnInit(): Promise<void> {
        this._activatedRoute.queryParams.subscribe(params => this.start = params['start']);
        this.loadTable(0, 1);
        this.loadTable(1, 2);

        this._Service.getInsurRenewType().subscribe((resp) => { this.listInsurRenewType = resp; });

        this.formData.get('startDate')?.valueChanges.subscribe(() => { this.rerender(); });
        this.formData.get('endDate')?.valueChanges.subscribe(() => { this.rerender(); });

        this.insurance_nameFilter.valueChanges
            .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this._onDestroy))
            .subscribe(() => {
                this._filterInsurance();
                this.rerender();
            });
    }

    ngAfterViewInit(): void {}
    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    onTabChange():void {
        // const idsArray = this.formData.get('ids') as FormArray;
        // idsArray.clear();
    }

    // DataTable Initialization
    // loadTable(): void { this._US.loadTable(this, this._Service, this._changeDetectorRef, this.pages, this, this.start, this); }
    loadTable(status: number, tableIndex: number): void {
        const dtOptionsKey = `dtOptions${tableIndex}`;  // ชื่อของตัวแปร dtOptions
        const pagesKey = `pages${tableIndex}`; // ชื่อของตัวแปร pages

        this[dtOptionsKey] = {
            pagingType: 'full_numbers', pageLength: 10, displayStart: this.start, order: [],
            serverSide: true, processing: true, responsive: true,
            language: { url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/th.json' },
            ajax: (dataTablesParameters: any, callback) => {
                const user = JSON.parse(localStorage.getItem('user'));
                const branch_id =  user?.employees?.branch_id;
                dataTablesParameters.branch_id = branch_id;
                this.currentStart = dataTablesParameters.start;
                dataTablesParameters.policy_number = status;
                dataTablesParameters.start_date = this.formData.get('startDate')?.value;
                dataTablesParameters.end_date = this.formData.get('endDate')?.value;
                dataTablesParameters.insurance_name = this.resolveInsuranceNameFilter();

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
    create(): void { this._US.createItem(this._Service, this._fuseConfirm, this.submitForm.bind(this), this.createResp); }
    // update(): void { this._US.updateItem(this.formData, this._Service, this._fuseConfirm, this.submitForm.bind(this), this.updateResp); }
    update(): void {
        this._US.confirmAction('แก้ไขรายการ', 'คุณต้องการแก้ไขรายการใช่หรือไม่', this._fuseConfirm,
        () => {
            this._Service.update(this.formData.value, this.formData.value.id_insuran).subscribe({
                next: (resp) => { this.updateResp = resp; this.rerender(); this.closeDialog(); },
                error: (err) => { console.error('เกิดข้อผิดพลาดขณะอัปเดต:', err); }
            });
        })
    }
    delete(id: any): void { this._US.deleteItem(id, this._Service, this._fuseConfirm, this.rerender.bind(this), this.deleteResp); }

    /* Date format (moment to json) */
    onDateChange(event: any, controlName: string, formName: FormGroup): void {
        this._US.onDateChange(event, controlName, formName);
    }
    onDateInput(event: any): void { this._US.onDateInput(event); }

    // Dialog Operations
    addressDialogRef: any;
    openDialog(item?: any, event?: Event): void {
        if (event) { event.stopPropagation(); }
        item ? (this.formData.patchValue(item), this.isEdit = true) : (this.isEdit = false);
        this._US.openDialog(this._matDialog, this.Dialog, this.dialogWidth, this.formData);
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
        this.formData, action, this._changeDetectorRef, this._fuseConfirm, this, this.rerender.bind(this), this.closeDialog.bind(this)
    );}

    pdf() {
        const user = JSON.parse(localStorage.getItem('user'));
        const branch_id =  user?.employees?.branch_id;
        const startDate = this.formData.get('startDate')?.value || this._US.pdfDefaultDate('firstDayOfMonth');
        const endDate = this.formData.get('endDate')?.value || this._US.pdfDefaultDate('lastDayOfMonth');
        const formatSDate = this._US.pdfDateFormat(startDate);
        const formatEDate = this._US.pdfDateFormat(endDate);

        const insurance_name = encodeURIComponent(this.resolveInsuranceNameFilter());
        const policy_number = this.selectedTabIndex === 1 ? 1 : 0;

        window.open(
            `${environment.API_URL}/api/report/exportPDF/InsurancesRenewals_report?start_date=${formatSDate}&end_date=${formatEDate}&insurance_name=${insurance_name}&branch_id=${branch_id}&policy_number=${policy_number}`,
            '_blank'
        );
    }

    excel() {
        const user = JSON.parse(localStorage.getItem('user'));
        const branch_id =  user?.employees?.branch_id;
        const startDate =
            this.formData.get('startDate')?.value ||
            this._US.pdfDefaultDate('firstDayOfMonth');
        const endDate =
            this.formData.get('endDate')?.value ||
            this._US.pdfDefaultDate('lastDayOfMonth');
        const formatSDate = this._US.pdfDateFormat(startDate);
        const formatEDate = this._US.pdfDateFormat(endDate);

        const insurance_name = encodeURIComponent(this.resolveInsuranceNameFilter());
        const policy_number = this.selectedTabIndex === 1 ? 1 : 0;

        window.open(
            `${environment.API_URL}/api/report/excel/InsurancesRenewals_report?start_date=${formatSDate}&end_date=${formatEDate}&insurance_name=${insurance_name}&branch_id=${branch_id}&policy_number=${policy_number}`,
            '_blank'
        );
    }

    private resolveInsuranceNameFilter(): string {
        const raw = this.insurance_nameFilter.value;
        if (raw == null || raw === '') {
            return '';
        }
        if (typeof raw === 'object' && raw !== null && typeof (raw as { name?: unknown }).name === 'string') {
            return (raw as { name: string }).name;
        }
        return String(raw);
    }

    protected _filterInsurance() {
        if (!this.insurance_name) {
            return;
        }
        let search = this.resolveInsuranceNameFilter();

        if (!search) {
            this.filterinsurance_name.next(this.insurance_name.slice());
            return;
        } else {
            search = search.toLowerCase();
        }

        this.filterinsurance_name.next(
            this.insurance_name.filter((item) =>
                item.name.toLowerCase().includes(search)
            )
        );
    }

    onSelectInsurance(event: any, type: any) {
        if (event == null) {
            this.insurance_nameFilter.setValue('', { emitEvent: false });
            if (this.insurance_nameFilter.invalid) {
                this.insurance_nameFilter.markAsTouched();
            }
            this.rerender();
            return;
        }

        const selectedData = event;

        if (selectedData) {
            this.insurance_nameFilter.setValue(`${selectedData.name}`, { emitEvent: false });
            this.rerender();
        } else {
            if (this.insurance_nameFilter.invalid) {
                this.insurance_nameFilter.markAsTouched();
            }
            return;
        }
    }
}
