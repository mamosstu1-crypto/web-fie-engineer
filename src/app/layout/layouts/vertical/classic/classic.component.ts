import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { FuseNavigationService, FuseVerticalNavigationComponent } from '@fuse/components/navigation';
import { Navigation } from 'app/core/navigation/navigation.types';
import { NavigationService } from 'app/core/navigation/navigation.service';
import { environment } from 'environments/environment';

@Component({
    selector: 'classic-layout',
    templateUrl: './classic.component.html',
    encapsulation: ViewEncapsulation.None
})
export class ClassicLayoutComponent implements OnInit, OnDestroy {
    isScreenSmall: boolean;
    navigation: Navigation;
    userData: any = null;
    branchNameResolved = '';
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        private _activatedRoute: ActivatedRoute,
        private _router: Router,
        private _navigationService: NavigationService,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _fuseNavigationService: FuseNavigationService,
        private _httpClient: HttpClient,
        private _changeDetectorRef: ChangeDetectorRef
    ) {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for current year
     */
    get currentYear(): number {
        return new Date().getFullYear();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // Subscribe to navigation data
        this.userData = this._getStoredUser();
        this._resolveBranchDisplayName();
        this._navigationService.navigation$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((navigation: Navigation) => {
                // const user = JSON.parse(localStorage.getItem('user')) || null;

                // // Store the access token in the local storage
                // if (user.role.type == 'marketing') {
                //     AuthService._marketingRole = false;
                //     this.navigation = navigation;
                // } else if (user.role.type == 'supplier') {
                //     AuthService._supplierRole = false;
                //     this.navigation = navigation;
                // } else if (user.role.type == 'store') {
                //     AuthService._storeRole = false;
                //     this.navigation = navigation;
                // } else if (user.role.type == '2nd_approve') {
                //     AuthService._2nd_approver = false;
                //     this.navigation = navigation;
                // } else if (user.role.type == 'authenticated' && user.admin_as == 'marketing') {
                //     AuthService._adminMarketing = false;
                //     this.navigation = navigation;
                // } else if (user.role.type == 'authenticated' && user.admin_as == 'store') {
                //     AuthService._adminStore = false;
                //     this.navigation = navigation;
                // } else if (user.role.type == 'authenticated' && user.admin_as == 'supplier') {
                //     AuthService._adminSupplier = false;
                //     this.navigation = navigation;
                // } else if (user.role.type == 'authenticated' && user.admin_as == 'all') {
                //     AuthService._admin = false;
                //     this.navigation = navigation;
                // }

                this.navigation = navigation;
            });

        // Subscribe to media changes
        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({ matchingAliases }) => {

                // Check if the screen is small
                this.isScreenSmall = !matchingAliases.includes('md');
            });
    }

    get displayName(): string {
        const emp = this._employeeRecord();
        const firstName = emp?.first_name ?? '';
        const lastName = emp?.last_name ?? '';
        const fullName = `${firstName} ${lastName}`.trim();

        return fullName || this.userData?.email || '-';
    }

    get branchDisplayLabel(): string {
        return this.branchNameResolved || this._branchNameFromStoredUser();
    }

    get headerTooltip(): string {
        const branch = this.branchDisplayLabel;
        return branch ? `${this.displayName} — สาขา ${branch}` : this.displayName;
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Toggle navigation
     *
     * @param name
     */
    toggleNavigation(name: string): void {
        // Get the navigation
        const navigation = this._fuseNavigationService.getComponent<FuseVerticalNavigationComponent>(name);

        if (navigation) {
            // Toggle the opened status
            navigation.toggle();
        }
    }

    private _getStoredUser(): any {
        try {
            const rawUser = localStorage.getItem('user');
            return rawUser ? JSON.parse(rawUser) : null;
        } catch {
            return null;
        }
    }

    private _employeeRecord(): any {
        return this.userData?.employees ?? this.userData?.Employees ?? null;
    }

    private _branchNameFromStoredUser(): string {
        const emp = this._employeeRecord();
        if (!emp) {
            return '';
        }
        if (emp.branch_display_name) {
            return emp.branch_display_name;
        }
        const branch = emp.branches ?? emp.Branches;
        return (branch?.business_name ?? branch?.name ?? '').trim();
    }

    private _resolveBranchDisplayName(): void {
        const cached = this._branchNameFromStoredUser();
        if (cached) {
            this.branchNameResolved = cached;
            return;
        }

        const branchId = this._employeeRecord()?.branch_id;
        if (branchId == null || branchId === '') {
            return;
        }

        this._httpClient
            .get<any>(`${environment.API_URL}/api/Brache/showID/${branchId}`)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (response) => {
                    const branch = response?.data ?? response;
                    this.branchNameResolved = (
                        branch?.business_name ??
                        branch?.name ??
                        ''
                    ).trim();
                    this._changeDetectorRef.markForCheck();
                },
                error: () => {
                    this._changeDetectorRef.markForCheck();
                },
            });
    }
}
