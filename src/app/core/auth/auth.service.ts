import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, } from '@angular/common/http';
import { BehaviorSubject, Observable, of, switchMap, throwError } from 'rxjs';
import { AuthUtils } from 'app/core/auth/auth.utils';
import { UserService } from 'app/core/user/user.service';
import { environment } from 'environments/environment';

const token = localStorage.getItem('accessToken') || null;

@Injectable()
export class AuthService {
    private _authenticated: boolean = false;
    private _requireResetPassword: boolean = false;
    private _jwt: string = null;

    public static _admin: boolean = true;

    public _me: BehaviorSubject<any[] | null> = new BehaviorSubject(null);

    constructor(
        private _httpClient: HttpClient,
        private _userService: UserService
    ) {
    }

    httpOptionsFormdata = {
        headers: new HttpHeaders({ Authorization: `bearer ${token}` })
    };

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    set accessToken(token: string) { localStorage.setItem('accessToken', token); }
    get accessToken(): string { return localStorage.getItem('accessToken') ?? ''; }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    forgotPassword(email: string): Observable<any> {
        return this._httpClient.post('api/auth/forgot-password', email);
    }

    resetPassword(id: string, data: { password: string; confrim_password: string }): Observable<any> {
        return this._httpClient.put(environment.API_URL + 'api/reset_password_user/' + id, data).pipe();
    }

    signIn(credentials: { email: string; password: string }): Observable<any> {
        // Throw error, if the user is already logged in
        if (this._authenticated) {
            return throwError('User is already logged in.');
        }

        return this._httpClient.post(environment.API_URL + '/api/auth/login', credentials).pipe(
            switchMap((response: any) => {
                if (response.code === 200) {
                    this._requireResetPassword = true;
                    this._jwt = response.access_token;

                    const user = this._userWithBranchLabel(response.user);
                    localStorage.setItem('user', JSON.stringify(user));
                    localStorage.setItem('accessToken', response.access_token);
                    localStorage.setItem('role', JSON.stringify(response.role));
                    // localStorage.setItem('permission', JSON.stringify(response.user.user_position[0].roles.role_permissions[0].permissions));

                    return of(response);
                }
            })
        );
    }

    signInUsingToken(): Observable<any> {
        this._authenticated = true;
        return of(true);
    }

    signOut(): Observable<any> {
        // Remove the access token from the local storage
        localStorage.removeItem('accessToken');
        localStorage.removeItem('role');
        localStorage.removeItem('user');

        // Set the authenticated flag to false
        this._authenticated = false;

        // Return the observable
        return of(true);
    }

    signUp(user: { name: string; email: string; password: string; company: string }): Observable<any> {
        return this._httpClient.post('api/auth/sign-up', user);
    }

    unlockSession(credentials: { email: string; password: string }): Observable<any> {
        return this._httpClient.post('api/auth/unlock-session', credentials);
    }

    check(): Observable<boolean> {
        // Check if the user is logged in
        if (this._authenticated) { return of(true); }

        // Check the access token availability
        if (!this.accessToken) { return of(false); }

        try {
            // Check the access token expire date
            if (AuthUtils.isTokenExpired(this.accessToken)) {
                this.signOut();
                return of(false);
            }
        } catch {
            this.signOut();
            return of(false);
        }

        // If the access token exists and it didn't expire, sign in using it
        return this.signInUsingToken();
    }

    /**
   * findRole the authentication status
   */
    // role(): Observable<any> {

    //     // If the access token exists and it didn't expire, sign in using it
    //     return this._httpClient.get(environment.API_URL + 'api/users/me', this.httpOptionsFormdata).pipe(
    //         switchMap((response: any) => {

    //             // Store the access token in the local storage
    //             this.user = JSON.stringify(response);

    //             // Return a new observable with the response
    //             return of(response);
    //         })
    //     );
    // }

    // me(): Observable<any> {
    //     return this._httpClient.get(environment.API_URL + 'api/users/me', this.httpOptionsFormdata);
    // }

    get requireResetPassword(): boolean {
        return this._requireResetPassword;
    }

    get jwt(): string {
        return this._jwt;
    }

    private _userWithBranchLabel(user: any): any {
        if (!user) {
            return user;
        }
        const emp = user.employees ?? user.Employees;
        if (!emp) {
            return user;
        }
        const branch = emp.branches ?? emp.Branches;
        const label = (branch?.business_name ?? branch?.name ?? '').trim();
        if (label) {
            emp.branch_display_name = label;
        }
        return user;
    }
}
