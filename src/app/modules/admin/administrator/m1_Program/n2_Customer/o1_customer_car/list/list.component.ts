import { LOCALE_ID, Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ViewChildren,
    QueryList, TemplateRef, ChangeDetectorRef, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog,MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, lastValueFrom, Observable, ReplaySubject, Subject, takeUntil } from 'rxjs';
import { fuseAnimations } from '@fuse/animations';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Service } from '../page.service';
import { DataTableDirective } from 'angular-datatables';
import { UtilityService, DATE_TH_FORMATS, CustomDateAdapter } from 'app/app.utility-service';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { FormDataFrame } from './list.mainframe';
import { FormDataService } from 'app/modules/matdynamic/form-data.service';
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

    // DataTables configuration and form data management
    public dtOptions: DataTables.Settings = {};
    public dataRow: any[] = [];
    public formData: FormGroup;
    public formGas_Edit: FormGroup;
    public formGas_Add: FormGroup;

    // Responses from CRUD operations
    private createResp: any[] = [];
    private updateResp: any[] = [];
    private deleteResp: any[] = [];


    // ViewChild decorators to reference template elements and directives
    @ViewChildren(DataTableDirective) dtElements: QueryList<DataTableDirective>;
    @ViewChild('Dialog') Dialog: TemplateRef<any>;
    @ViewChild('HullDialog') HullDialog: TemplateRef<any>;
    @ViewChild('AddGasDialog') AddGasDialog: TemplateRef<any>;

    public addGasDialogRef: MatDialogRef<any> | undefined;
    public listGasBrands: any[] = [];
    private vechicle_id:number;

    // Utility variables for component state and management
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private Id: string;
    private pages = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    private dialogWidth: number = 90; // scale in %
    private start: number;

    public flashMessage: 'success' | 'error' | null = null;
    public isLoading: boolean = false;
    public currentStart: number = 0;
    public isEdit: boolean = false;

    // Lists containing data used for dropdowns or select options in the form
    private listProvinces: any[] = [];
    private listInspection: any[] = [];
    private listInsurance: any[] = [];
    private listBrands: any[] = [];
    private listModels: any[] = [];
    // Flags to manage the selection state of various form fields
    private isBrandSelected: boolean = true;

    private isGasAdded: boolean = true;

    customer: any;
    customerFilter = new FormControl('');
    filterCustomer: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseConfirm: FuseConfirmationService,
        private _formBuilder: FormBuilder,
        private _Service: Service,
        private _matDialog: MatDialog,
        private _activatedRoute: ActivatedRoute,
        public _formDataFrame: FormDataFrame,
        private _formDataService: FormDataService,
        private _US: UtilityService,
    ) {
        this.formData = this._formDataFrame.createMainForm();
        this._formDataService.setFormGroup('formData', this.formData);

        this.formGas_Edit = this._formDataFrame.createGasEditForm();
        this._formDataService.setFormGroup('formGas_Edit', this.formGas_Edit);

        this.formGas_Add = this._formDataFrame.createGasAddForm();
        this._formDataService.setFormGroup('formGas_Add', this.formGas_Add);

        this.addGroup();
        this.customer = this._activatedRoute.snapshot.data.customer.data
        this.filterCustomer.next(this.customer.slice());
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /* Lifecycle Hooks */
    async ngOnInit(): Promise<void> {
        this._activatedRoute.queryParams.pipe(takeUntil(this._unsubscribeAll))
            .subscribe(params => { this.start = params['start']; });
        this.Id = this._activatedRoute.snapshot.paramMap.get('id');
        this.loadTable();

        const initialData = await lastValueFrom(
            forkJoin(
                this._Service.getProvinces(),
                this._Service.getInspection(),
                this._Service.getInsurance(),
                this._Service.getBrand(),
            )
        );
        this.listProvinces = initialData[0];
        this.listInspection = initialData[1];
        this.listInsurance = initialData[2];
        this.listBrands = initialData[3];
        this._Service.getGasBrands().subscribe((resp) => { this.listGasBrands = resp; });

        this.customerFilter.valueChanges
        .pipe(takeUntil(this._onDestroy))
        .subscribe(() => {
            this._filterCustomer();
        });
    }

    ngAfterViewInit(): void {}
    protected _onDestroy = new Subject<void>();
    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // DataTable Initialization
    // loadTable(): void { this._US.loadTable(this, this._Service, this._changeDetectorRef, this.pages, this, this.start, this); }
    loadTable(): void {
        this.dtOptions = {
            pagingType: 'full_numbers', pageLength: 10, displayStart: this.start,
            serverSide: true, processing: true, responsive: true, order: [[0, 'desc']],
            language: { url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/th.json', },
            ajax: (dataTablesParameters: any, callback) => {
                this.currentStart = dataTablesParameters.start;
                const order = dataTablesParameters.order.length > 0
                    ? dataTablesParameters.order[0]
                    : { column: 0, dir: 'desc' };
                this._Service.getPage({ ...dataTablesParameters, order: [order] }).subscribe((resp) => {
                    this.dataRow = resp.data;
                    this.pages.current_page = resp.current_page;
                    this.pages.last_page = resp.last_page;
                    this.pages.per_page = resp.per_page;

                    if (resp.current_page > 1) { this.pages.begin = resp.per_page * (resp.current_page - 1);
                    } else { this.pages.begin = 0; }

                    callback({ recordsTotal: resp.total, recordsFiltered: resp.total, data: [] });
                    this._changeDetectorRef.markForCheck();
                });
            },
        };
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /* Event Handlers for Dropdown Changes */
    onBrandChange(): void {
        this.formData.patchValue({ model_id: '', });
        this.isBrandSelected = this.formData.value.brand_id !== '';

        if (this.isBrandSelected) {
            this._Service.getFilterModel(this.formData.value.brand_id).subscribe(
                resp => this.listModels = resp.vehicle_models || []
            );
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /* Gas Array management */
    get gas(): FormArray { return this.formGas_Add.get('gas') as FormArray; }
    addGroup(): void {
        const group = this._formBuilder.group({
            vehicle_id: this.vechicle_id,
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
    removeGroup(index: number): void { this.gas.removeAt(index); }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /* CRUD Operations */
    create(): void  {
        this._US.confirmAction('สร้างรายการใหม่', 'คุณต้องการสร้างรายการใหม่ใช่หรือไม่', this._fuseConfirm,
            () => { this._Service.create(this.formData.value).subscribe({
                    next: (resp) => {
                        this.createResp = resp;
                        const id = resp.data.id;

                        if (this.isGasAdded) {
                            this.cleanGasForm();
                            this.patchVehicleId(id);
                            this.createGas(id);
                            this.clearAllGas();
                        }
                        this.rerender();
                        this.closeDialog(this.dialogRef1);
                    },
                    error: (err) => { console.error('Error updating gas record:', err); },
            });}
        );
    }
    update(): void {
        this._US.confirmAction('แก้ไขรายการ', 'คุณต้องการแก้ไขรายการใช่หรือไม่', this._fuseConfirm,
            () => { this._Service.update(this.formData.value, this.dialogCache.id).subscribe({
                    next: (resp) => {
                        this.updateResp = resp;

                        if (this.isGasAdded) {
                            this.cleanGasForm();
                            this.patchVehicleId();
                            this.createGas();
                            this.clearAllGas();
                        }
                        this.rerender();
                        this.closeDialog(this.dialogRef1);
                    },
                    error: (err) => { console.error('Error updating gas record:', err); },
            });}
        );
    }
    delete(id: any): void { this._US.deleteItem(id, this._Service, this._fuseConfirm, this.rerender.bind(this), this.deleteResp); }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /* Gas CRUD Operations */
    createGas(id?: number): void  {
        this.patchVehicleId(id);
        const formData = {
            ...this.formGas_Add.value,
            gas: this.formGas_Add.value.gas.map(gasItem => ({
                ...gasItem,
                gas_create: gasItem.gas_create
                    ? new Date(gasItem.gas_create).toISOString().split('T')[0]
                    : '',
                gas_expire: gasItem.gas_expire
                    ? new Date(gasItem.gas_expire).toISOString().split('T')[0]
                    : ''
            }))
        };
        this._Service.createGas(formData).subscribe({
            next: (resp) => { this.loadGasData((id) ? id : this.dialogCache.id); this.closeDialog(this.addGasDialogRef);},
            error: (err) => { console.error('Error creating gas record:', err); },
        });
    }
    updateGas(): void  {
        this._US.confirmAction('แก้ไขรายการ', 'คุณต้องการแก้ไขรายการใช่หรือไม่', this._fuseConfirm,
            () => { this._Service.updateGas(this.formGas_Edit.value, this.gasEditCache.id).subscribe({
                    complete: () => { this.loadGasData(this.dialogCache.id); this.closeDialog(this.dialogRef2); },
                    error: (err) => { console.error('Error updating gas record:', err); },
            });}
        );
    }
    deleteGas(id: any): void  {
        this._US.confirmAction('ลบรายการที่เลือก', 'คุณต้องการลบรายการที่เลือกใช่หรือไม่', this._fuseConfirm,
            () => { this._Service.delete_gas(id).subscribe({
                    complete: () => { this.loadGasData(this.dialogCache.id); },
                    error: (err) => { console.error('Error deleting gas record:', err); },
            });}
        );
    }
    private loadGasData(id_main: any): void  { this._Service.getGasByID(id_main).subscribe({
        next: (data) => { this.formData.patchValue({ vehicle_gas: data }); },
        error: (err) => { console.error('Error loading vehicle gas data:', err); },
    });}

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /* Support function */
    private cleanGasForm(): void { // Iterate over the FormArray in reverse to safely remove items while iterating
        for (let i = this.gas.length - 1; i >= 0; i--) { // Check if any field in the group has a non-empty value
            const group = this.gas.at(i) as FormGroup;
            const hasValue = Object.values(group.controls).some(control => control.value && control.value.trim() !== '');

            (hasValue) ? (this.isGasAdded = true) : (this.gas.removeAt(i)) // Remove the group if no field has a value
        }
    }
    private clearAllGas(): void {
        for (let i = this.gas.length - 1; i >= 0; i--) { this.gas.removeAt(i); }
        this.isGasAdded = false; this.addGroup();
    }
    private patchVehicleId(id?: number): void {
        this.gas.controls.forEach((group: FormGroup) => { group.patchValue({
            vehicle_id: (id) ? id : this.dialogCache.id
        });});
    }

    getGasCreatePickerId(index: number): string { return `gasCreatePicker${index}`; }
    getGasExpirePickerId(index: number): string { return `gasExpirePicker${index}`; }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    onDateChange(event: any, controlName: string, form: FormGroup | FormArray, index?: number): void {
        if (form instanceof FormArray && index !== undefined) {
            // หากเป็น FormArray ใช้ index ในการเข้าถึง FormGroup
            const group = form.at(index) as FormGroup;
            this.formatDateAndSetValue(group, controlName, event.value);
        } else if (form instanceof FormGroup) {
            // หากเป็น FormGroup โดยตรง
            this.formatDateAndSetValue(form, controlName, event.value);
        }
    }
    private formatDateAndSetValue(form: FormGroup, controlName: string, dateValue: any): void {
        const formattedDate = moment(dateValue).format('YYYY-MM-DD');
        form.get(controlName)?.setValue(formattedDate);
    }

    onDateInput(event: any): void { this._US.onDateInput(event); }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /* Dialog Operations */
    dialogRef1: any; dialogRef2: any;
    dialogCache: any;
    selectedTabIndex: number = 0;
    changeTab(index: number): void { this.selectedTabIndex = index; }

    openDialog(item?: any, event?: Event): void {
        this.customerFilter.setValue(''); // ล้างค่าในช่อง input

        if (event) { event.stopPropagation(); }
        if (item) {
            this.formData.patchValue(item);
            this.customerFilter.setValue(item?.customers?.name + ' ' + (item?.customers?.lname ?? ''));
            this.isEdit = true;
            this.dialogCache = item;


            if (item.id) { this.forceCall(item.id); }
        } else {
            this.isEdit = false
        }

        this.vechicle_id = item?.id;

        this.dialogRef1 = this._US.openDialog(this._matDialog, this.Dialog, this.dialogWidth, this.formData);
        this.isBrandSelected = this.formData.value.brand_id !== '';
    }
    async forceCall(id: string): Promise<void> {
        try {
            const resp = await lastValueFrom(this._Service.getVehicle(id));
            const respModel = await lastValueFrom(this._Service.getFilterModel(resp.data?.brand_id || ''));
            this.listModels = respModel?.vehicle_models || [];

            this.formData.patchValue({ ...resp.data });
        } catch (error) {
            console.error('Error fetching data:', error); // handle error
        }
    }
    gasEditCache: any;
    openGasEdit(item: any): void {
        this.formGas_Edit.patchValue(item);
        this.gasEditCache = item;
        this.dialogRef2 = this._US.openDialog(this._matDialog, this.HullDialog, this.dialogWidth, this.formGas_Edit);
    }
    closeDialog(Ref?: any): void { (Ref) ? (this._US.closeDialog(Ref)) : (this._matDialog.closeAll()) }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /* Utility Methods */
    rerender(): void { this.dtElements.forEach((dtElement: DataTableDirective) =>
        { dtElement.dtInstance.then((dtInstance: any) => dtInstance.ajax.reload()); });
    }
    showEdit(): boolean { return this._US.hasPermission(1); }
    showDelete(): boolean { return this._US.hasPermission(1); }
    showFlashMessage(type: 'success' | 'error'): void { this._US.showFlashMessage(type, this._changeDetectorRef, this); }

    private submitForm(action: (formData: FormData) => Observable<any>): void { this._US.submitForm(
        this.formData, action, this._changeDetectorRef, this._fuseConfirm, this, this.rerender.bind(this), this.closeDialog.bind(this)
    );}

    openAddGasDialog(): void {
        this.clearAllGas();
        this.addGasDialogRef = this._matDialog.open(this.AddGasDialog, { width: '90%'  });
    }

    onOptionCustomer(event: any) {
        const selectedName = event.option.value;
        const selected = this.customer.find(item => item.name === selectedName);

        if (selected) {
            this.formData.patchValue({
                customer_id: selected.id
            })
            this.customerFilter.setValue(selected.name); // ล้างค่าในช่อง input
        }
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
}
