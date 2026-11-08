import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { debounceTime, map, Observable, of, Subject, switchMap, takeUntil } from 'rxjs';
// import { BriefPlanService } from 'app/modules/admin/marketing/brief-plan/brief-plan.service';

@Component({
    selector: 'address-dialog',
    templateUrl: './address-dialog.component.html',
    // encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddressDialogComponent implements OnInit, OnDestroy {
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    address: any[] = []

    /**
     * Constructor
     */
    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        @Inject(MAT_DIALOG_DATA) private _data,
        private _matDialogRef: MatDialogRef<AddressDialogComponent>
    ) {
        this._data.forEach(element => {
            const fullAddress = `${element.address ?? ''} ${element.provinces?.name_th ?? ''} ${element.districts?.name_th ?? ''} ${element.sub_districts?.name_th ?? ''} ${element.sub_districts?.zip_code ?? ''}`;
            this.address.push(fullAddress)
        });
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    onSelect(item:any) {
        this._matDialogRef.close(item)
    }


    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------
}
