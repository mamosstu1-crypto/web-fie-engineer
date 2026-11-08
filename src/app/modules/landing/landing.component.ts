import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';

@Component({
    selector: 'app-landing',
    templateUrl: './landing.component.html',
    styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit {

    me: any | null;

    constructor(
        private _authService: AuthService,
        private _router: Router,
    ) { }

    ngOnInit(): void {
        let redirectURL = '/signed-in-redirect';
        redirectURL = 'shelf/list';
        this._router.navigateByUrl(redirectURL);
    }

}
