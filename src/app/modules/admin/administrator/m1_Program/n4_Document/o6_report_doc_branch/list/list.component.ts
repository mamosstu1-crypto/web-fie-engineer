import { data } from 'jquery';
import {
    LOCALE_ID, Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ViewChildren,
    QueryList, TemplateRef, ChangeDetectorRef, ChangeDetectionStrategy, HostListener
} from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { lastValueFrom, Observable, ReplaySubject, Subject, takeUntil } from 'rxjs';
import { fuseAnimations } from '@fuse/animations';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Service } from '../page.service';
import { DataTableDirective } from 'angular-datatables';
import { UtilityService, DATE_TH_FORMATS, CustomDateAdapter } from 'app/app.utility-service';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { FormDataService } from 'app/modules/matdynamic/form-data.service';
import { environment } from 'environments/environment';
import { DateTime } from 'luxon';
import * as XLSX from 'xlsx';
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
    form: FormGroup
    formFieldHelpers: string[] = ['fuse-mat-dense'];
    // Properties and ViewChilds
    public dtOptions: DataTables.Settings = {};
    public dataRow: any[any] = [];
    public formData: FormGroup;
    public createResp: any[] = [];
    public updateResp: any[] = [];
    public deleteResp: any[] = [];
    public flashMessage: 'success' | 'error' | null = null;
    public isLoading: boolean = false;
    public currentStart: number = 0;
    public pages = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    public isEdit: boolean = false;
    public dialogWidth: number = 40; // scale in %
    branchs: any[] = [];
    customers: any[] = [];
    itemFilter = new FormControl('');
    filterItem: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
    @ViewChildren(DataTableDirective) dtElements: QueryList<DataTableDirective>;
    @ViewChild(MatPaginator) _paginator: MatPaginator;
    @ViewChild('Dialog') Dialog: TemplateRef<any>;

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private start: number;
    user: any;
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
        this.branchs = this._activatedRoute.snapshot.data.branchs
        this.customers = this._activatedRoute.snapshot.data.customers.data
        this.filterItem.next(this.customers.slice());
        this.user = JSON.parse(localStorage.getItem('user'))

        this.form = this._formBuilder.group({
            date_start: new Date(),
            date_end: new Date(),
            customer_id: '',
            branch_id: this.user?.employees?.branch_id
        })
    }

    // Lifecycle Hooks
    async ngOnInit(): Promise<void> {
        this.itemFilter.valueChanges
            .pipe(takeUntil(this._onDestroy))
            .subscribe(() => {
                this._filterCustomer();
            });

        this.GetReport()
    }
    protected _filterCustomer() {
        if (!this.customers) {
            return;
        }
        let search = this.itemFilter.value;
        if (!search) {
            this.filterItem.next(this.customers.slice());
            return;
        } else if (typeof search === 'string') {
            search = search.toLowerCase();
        } else {
            search = ''; // หรือกำหนดค่า default ที่เหมาะสม
        }
        this.filterItem.next(
            this.customers.filter(item =>
                item.name.toLowerCase().indexOf(search) > -1
            )
        );
    }


    ngAfterViewInit(): void { }
        /**

     * On destroy
     */  protected _onDestroy = new Subject<void>();
    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    pdf() {

        // window.open(`${environment.API_URL}/api/report/reportExportPDFdaily_report?check_date=${formatSDate}`);
    }
    lengthsummary:number = 0;
    lengthsummaryhead:number = 0;
    serviceTypes: any[];
    GetReport() {
        const formValue = {
            ...this.form.value
        }

        formValue.date_start = DateTime.fromJSDate(this.form.value.date_start).toFormat('yyyy-MM-dd');
        formValue.date_end= DateTime.fromJSDate(this.form.value.date_end).toFormat('yyyy-MM-dd');
        // formValue.branch_id= this.user?.employees?.branch_id;

        this._Service.getreport(formValue).subscribe((resp: any) => {
            this.dataRow = resp.data
            this._changeDetectorRef.markForCheck()
        })
    }
    getIncomeByType(summary: any[], typeId: number): number {
        const service = summary.find(s => s.service_type_id === typeId);
        return service ? service.income : 0;
      }

    dateChange() {
        let dateStart = DateTime.fromJSDate(this.form.value.date_start).toFormat('yyyy-MM-dd');
        let dateEnd = DateTime.fromJSDate(this.form.value.date_end).toFormat('yyyy-MM-dd');
    }

    clearData() {
        this.form.reset();;
    }

    onSelect(event: any, type: any) {
        if (!event) {
            if (this.itemFilter.invalid) {
                this.itemFilter.markAsTouched(); // กำหนดสถานะ touched เพื่อแสดง mat-error
            }
            return;
        }
        const selectedData = event; // event จะเป็นออบเจ็กต์ item
        if (selectedData) {
            // this.form.patchValue({
            //     headId: selectedData.id,
            // });
            this.itemFilter.setValue(`${selectedData.name}`);
            // this.selectedValue.emit(selectedData)
            this.form.patchValue({
                customer_id: selectedData.id
            })

        } else {
            if (this.itemFilter.invalid) {
                this.itemFilter.markAsTouched(); // กำหนดสถานะ touched เพื่อแสดง mat-error
            }
            return;
        }
    }

    getColumnTotal(index: number): number {
        return this.dataRow.reduce((sum, item) => {
            const serviceAmount = item?.services?.[index]?.amount ?? 0;
            return sum + serviceAmount;
        }, 0);
    }

    getTotal(key: string): number {
        return this.dataRow.reduce((sum, item) => {
            return sum + (item?.[key] ?? 0); // รวมค่า ถ้าไม่มีให้ใช้ 0
        }, 0);
    }

    export() {
        /* pass here the table id */
        let element = document.getElementById('excel-table');
        const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(element);

        /* generate workbook and add the worksheet */
        const wb: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

        /* save to file */
        XLSX.writeFile(wb, 'รายงานประจำวัน.xlsx');
    }
}
