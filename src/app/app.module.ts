import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './services/auth.interceptor';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { HeaderComponent } from './components/header/header.component';
import { ScoreGameComponent } from './components/score-game/score-game.component';
import { EventLogComponent } from './components/event-log/event-log.component';
import { RecordInstructionsComponent } from './components/record-instructions/record-instructions.component';
import { LiveIndicatorComponent } from './components/live-indicator/live-indicator.component';
import { ConfirmationModalComponent } from './components/confirmation-modal/confirmation-modal.component';
import { GameSetupComponent } from './components/game-setup/game-setup.component';
import { MediaLibraryComponent } from './components/media-library/media-library.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { FieldManagementComponent } from './components/field-management/field-management.component';
import { ClubManagementComponent } from './components/club-management/club-management.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { FieldCameraManagementComponent } from './components/field-camera-management/field-camera-management.component';
import { MatchHistoryComponent } from './components/match-history/match-history.component';
import { VideoPlayerComponent } from './components/video-player/video-player.component';
import { TutorialCarouselModalComponent } from './components/tutorial-carousel-modal/tutorial-carousel-modal.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    HomeComponent,
    HeaderComponent,
    ScoreGameComponent,
    EventLogComponent,
    RecordInstructionsComponent,
    LiveIndicatorComponent,
    ConfirmationModalComponent,
    GameSetupComponent,
    MediaLibraryComponent,
    AdminDashboardComponent,
    FieldManagementComponent,
    ClubManagementComponent,
    UserManagementComponent,
    FieldCameraManagementComponent,
    MatchHistoryComponent,
    VideoPlayerComponent,
    TutorialCarouselModalComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
