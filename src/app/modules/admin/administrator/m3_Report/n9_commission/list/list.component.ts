import { LOCALE_ID, Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ViewChildren,
    QueryList, TemplateRef, ChangeDetectorRef, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { lastValueFrom, Observable, Subject } from 'rxjs';
import { fuseAnimations } from '@fuse/animations';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Service } from '../page.service';
import { DataTableDirective } from 'angular-datatables';
import { ADTSettings } from 'angular-datatables/src/models/settings';
import { UtilityService, DATE_TH_FORMATS, CustomDateAdapter } from 'app/app.utility-service';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
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
    public dataRow: any[] = [];
    public subdataRow: any[] = [];
    public dtOptions: DataTables.Settings = {};
    dtTrigger: Subject<ADTSettings> = new Subject<ADTSettings>();
    public formData: FormGroup;
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

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private start: number;
    defaultEndDate: Date;
    public user: any;

    /** คอลัมน์บริการ — label สั้นบนตาราง, title เป็นชื่อเต็ม (hover) */
    readonly serviceColumns: { key: string; label: string; title: string }[] = [
        { key: 'vehicle_Inspection', label: 'ตรวจสภาพ', title: 'ตรวจสภาพรถ' },
        { key: 'compulsory_Insurance', label: 'พ.ร.บ.', title: 'พ.ร.บ.' },
        { key: 'annual_tax', label: 'ภาษี', title: 'ภาษีประจำปี' },
        { key: 'tax_fines', label: 'เงินเพิ่ม', title: 'เงินเพิ่มภาษี' },
        { key: 'tax_renewal_service', label: 'ต่อภาษี', title: 'บริการต่อภาษี' },
        { key: 'penalty', label: 'ค่าปรับ', title: 'ค่าปรับ' },
        { key: 'insurance', label: 'ประกัน', title: 'ประกัน' },
        { key: 'LPG_inspection', label: 'LPG ตรวจ', title: 'ตรวจสภาพ LPG' },
        { key: 'LPG_installation', label: 'LPG ติด', title: 'ตรวจติดตั้ง LPG' },
        { key: 'LPG_renewal', label: 'LPG ต่อ', title: 'ตรวจต่ออายุ LPG' },
        { key: 'NGV_inspection', label: 'NGV ตรวจ', title: 'ตรวจสภาพ NGV' },
        { key: 'NGV_installation', label: 'NGV ติด', title: 'ตรวจติดตั้ง NGV' },
        { key: 'engineer_certificate', label: 'วิศวกร', title: 'หนังสือรับรองวิศวกร' },
        { key: 'transportation', label: 'ขนส่ง', title: 'ขนส่ง' },
        { key: 'other', label: 'อื่นๆ', title: 'อื่นๆ' },
        { key: 'EMS', label: 'EMS', title: 'EMS' },
    ];

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseConfirm: FuseConfirmationService,
        private _formBuilder: FormBuilder,
        private _Service: Service,
        private _matDialog: MatDialog,
        private _activatedRoute: ActivatedRoute,
        private _formDataService: FormDataService,
        private _US: UtilityService,
    ) {
        const today = new Date();
        this.defaultEndDate = new Date(today);
        this.defaultEndDate.setMonth(this.defaultEndDate.getMonth() - 1);
        this.formData = this._formBuilder.group({
            name: '',
            id: ['', Validators.required],
            start_date: [this.defaultEndDate],
            end_date: [today],
        }); this._formDataService.setFormGroup('formData', this.formData);
    }

    // Lifecycle Hooks
    async ngOnInit(): Promise<void> {
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this._activatedRoute.queryParams.subscribe(params => this.start = params['start']);

        this.loadTable();

    }
    ngAfterViewInit(): void {
        setTimeout(() => {
            this.dtTrigger.next(this.dtOptions as ADTSettings);
            this.resetTableScroll();
        }, 200);
    }

    private resetTableScroll(): void {
        const el = document.querySelector('.commission-scroll') as HTMLElement | null;
        if (el) {
            el.scrollLeft = 0;
        }
    }
    ngOnDestroy(): void {
        this.dtTrigger.unsubscribe();
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // DataTable Initialization
    // loadTable(): void { this._US.loadTable(this, this._Service, this._changeDetectorRef, this.pages, this, this.start, this); }
    loadTable(): void {
        this.dtOptions = {
            pagingType: 'full_numbers',
            pageLength: 10,
            displayStart: this.start,
            serverSide: true,
            processing: true,
            responsive: false,
            order: [],
            ordering: false,
            orderCellsTop: true,
            language: { url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/th.json' },
            ajax: (dataTablesParameters: any, callback) => {
                this.currentStart = dataTablesParameters.start;
                const startDate = this.formData.controls['start_date'].value;
                const endDate = this.formData.controls['end_date'].value;
                dataTablesParameters.start_date = startDate ? this.formatDate(startDate) : null;
                dataTablesParameters.end_date = endDate ? this.formatDate(endDate) : null;
                dataTablesParameters.branch_id = this.user?.employees?.branch_id ?? '';

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
                    setTimeout(() => this.resetTableScroll(), 0);
                });
            },
        };
    }

    // CRUD Operations
    create(): void { this._US.createItem(this._Service, this._fuseConfirm, this.submitForm.bind(this), this.createResp); }
    update(): void { this._US.updateItem(this.formData, this._Service, this._fuseConfirm, this.submitForm.bind(this), this.updateResp); }
    delete(id: any): void { this._US.deleteItem(id, this._Service, this._fuseConfirm, this.rerender.bind(this), this.deleteResp); }

    // Dialog Operations
    openDialog(item?: any, event?: Event): void {
        if (event) { event.stopPropagation(); }
        item ? (this.formData.patchValue(item), this.isEdit = true) : (this.isEdit = false);
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

    serviceCount(item: { serviceSummary?: Record<string, number> }, key: string): number {
        const n = item?.serviceSummary?.[key];
        return typeof n === 'number' && n > 0 ? n : 0;
    }

    formatDate(date: any): string {
        if (!date) return '';
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [year, month, day].join('-');
    }

    private commissionReportQueryParams(): string {
        const startDate = this.formData.get('start_date')?.value;
        const endDate = this.formData.get('end_date')?.value;
        const formatSDate = this._US.pdfDateFormat(startDate);
        const formatEDate = this._US.pdfDateFormat(endDate);
        const branchId = this.user?.employees?.branch_id ?? '';
        const params = new URLSearchParams({
            start_date: formatSDate,
            end_date: formatEDate,
        });
        if (branchId !== '' && branchId != null) {
            params.set('branch_id', String(branchId));
        }
        return params.toString();
    }

    pdf(): void {
        window.open(`${environment.API_URL}/api/export/commissPDF?${this.commissionReportQueryParams()}`);
    }

    excel(): void {
        window.open(`${environment.API_URL}/api/export/commissExcel?${this.commissionReportQueryParams()}`);
    }

    /* Date format (moment to json) */
    onDateChange(event: any, controlName: string, formName: FormGroup): void {
        this._US.onDateChange(event, controlName, formName);
        this.rerender();
    }
    onDateInput(event: any): void { this._US.onDateInput(event); }
}
