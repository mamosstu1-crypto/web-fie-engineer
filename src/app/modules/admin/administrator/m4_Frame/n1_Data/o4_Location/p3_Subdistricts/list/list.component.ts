import {
    LOCALE_ID, Component, OnInit, AfterViewInit, OnDestroy,
    ViewChild, ViewChildren, QueryList, TemplateRef, ChangeDetectorRef,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { fuseAnimations } from '@fuse/animations';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Service } from '../page.service';
import { DataTableDirective } from 'angular-datatables';
import { UtilityService, DATE_TH_FORMATS, CustomDateAdapter } from 'app/app.utility-service';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { FormDataService } from 'app/modules/matdynamic/form-data.service';

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

    public dtOptions: DataTables.Settings = {};
    public dataRow: any[] = [];
    public formData: FormGroup;
    public createResp: any[] = [];
    public updateResp: any[] = [];
    public deleteResp: any[] = [];
    public flashMessage: 'success' | 'error' | null = null;
    public isLoading: boolean = false;
    public currentStart: number = 0;
    public pages = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    public isEdit: boolean = false;
    public dialogWidth: number = 40;

    public listProvinces: any[] = [];
    public listDistricts: any[] = [];
    public selectedProvinceId: string = '';

    public filterParams: any = {};
    public filterProvinceId: string = '';
    public filterDistrictId: string = '';
    public filterDistrictList: any[] = [];

    @ViewChildren(DataTableDirective) dtElements: QueryList<DataTableDirective>;
    @ViewChild(MatPaginator) _paginator: MatPaginator;
    @ViewChild('Dialog') Dialog: TemplateRef<any>;

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private start: number;

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
        this.formData = this._formBuilder.group({
            id: ['', Validators.required],
            name_th: ['', Validators.required],
            name_en: [''],
            district_id: ['', Validators.required],
            zip_code: [''],
        });
        this._formDataService.setFormGroup('formData', this.formData);
    }

    async ngOnInit(): Promise<void> {
        this._activatedRoute.queryParams.subscribe(params => this.start = params['start']);
        this.loadTable();
        this._Service.getProvinces().subscribe((resp) => {
            this.listProvinces = resp || [];
        });
    }
    ngAfterViewInit(): void {}
    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    loadTable(): void { this._US.loadTable(this, this._Service, this._changeDetectorRef, this.pages, this, this.start, this, this.filterParams); }

    onFilterProvinceChange(): void {
        this.filterDistrictId = '';
        this.filterDistrictList = [];
        delete this.filterParams.district_id;
        if (this.filterProvinceId) {
            this._Service.getDistricts(this.filterProvinceId).subscribe((resp: any) => {
                this.filterDistrictList = resp?.districts || [];
            });
        }
        this.rerender();
    }

    onFilterDistrictChange(): void {
        if (this.filterDistrictId) {
            this.filterParams.district_id = this.filterDistrictId;
        } else {
            delete this.filterParams.district_id;
        }
        this.rerender();
    }

    create(): void { this._US.createItem(this._Service, this._fuseConfirm, this.submitForm.bind(this), this.createResp); }
    update(): void { this._US.updateItem(this.formData, this._Service, this._fuseConfirm, this.submitForm.bind(this), this.updateResp); }
    delete(id: any): void { this._US.deleteItem(id, this._Service, this._fuseConfirm, this.rerender.bind(this), this.deleteResp); }

    onProvinceChange(provinceId: string): void {
        this.selectedProvinceId = provinceId;
        this.listDistricts = [];
        this.formData.get('district_id')?.setValue('');
        if (provinceId) {
            this._Service.getDistricts(provinceId).subscribe((resp: any) => {
                this.listDistricts = resp?.districts || [];
            });
        }
    }

    openDialog(item?: any, event?: Event): void {
        if (event) { event.stopPropagation(); }
        this.listDistricts = [];
        this.selectedProvinceId = '';

        if (item) {
            this.formData.patchValue({
                id: item.id,
                name_th: item.name_th,
                name_en: item.name_en,
                district_id: item.district_id,
                zip_code: item.zip_code,
            });
            this.isEdit = true;

            const provinceId = item.districts?.province_id
                ?? item.district?.province_id
                ?? item.province_id
                ?? null;
            if (provinceId) {
                this.selectedProvinceId = provinceId;
                this._Service.getDistricts(provinceId).subscribe((resp: any) => {
                    this.listDistricts = resp?.districts || [];
                    this.formData.patchValue({ district_id: item.district_id });
                });
            }
        } else {
            this.formData.reset();
            this.isEdit = false;
        }
        this._US.openDialog(this._matDialog, this.Dialog, this.dialogWidth, this.formData);
    }

    closeDialog(Ref?: any): void { Ref ? this._US.closeDialog(Ref) : this._matDialog.closeAll(); }

    rerender(): void {
        this.dtElements.forEach((dtElement: DataTableDirective) => {
            dtElement.dtInstance.then((dtInstance: any) => dtInstance.ajax.reload());
        });
    }
    showEdit(): boolean { return this._US.hasPermission(1); }
    showDelete(): boolean { return this._US.hasPermission(1); }
    showFlashMessage(type: 'success' | 'error'): void { this._US.showFlashMessage(type, this._changeDetectorRef, this); }

    private submitForm(action: (formData: FormData) => Observable<any>): void {
        this._US.submitForm(
            this.formData, action, this._changeDetectorRef, this._fuseConfirm, this, this.rerender.bind(this), this.closeDialog.bind(this)
        );
    }
}
