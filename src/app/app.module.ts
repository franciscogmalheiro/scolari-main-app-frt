import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './services/auth.interceptor';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { HeaderComponent } from './components/header/header.component';
import { GameCardComponent } from './components/game-card/game-card.component';
import { ScoreGameComponent } from './components/score-game/score-game.component';
import { TeamEditModalComponent } from './components/team-edit-modal/team-edit-modal.component';
import { EventLogComponent } from './components/event-log/event-log.component';
import { RecordInstructionsComponent } from './components/record-instructions/record-instructions.component';
import { QrModalComponent } from './components/qr-modal/qr-modal.component';
import { LiveIndicatorComponent } from './components/live-indicator/live-indicator.component';
import { ConfirmationModalComponent } from './components/confirmation-modal/confirmation-modal.component';
import { DownloadVideoComponent } from './components/download-video/download-video.component';
import { GameSetupComponent } from './components/game-setup/game-setup.component';
import { VideoLibraryComponent } from './components/video-library/video-library.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { FieldManagementComponent } from './components/field-management/field-management.component';
import { ClubManagementComponent } from './components/club-management/club-management.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { FieldCameraManagementComponent } from './components/field-camera-management/field-camera-management.component';
import { MatchHistoryComponent } from './components/match-history/match-history.component';
import { SportService } from './services/sport.service';
import { ClubService } from './services/club.service';
import { ClubFieldService } from './services/club-field.service';
import { UserService } from './services/user.service';
import { FieldCameraService } from './services/field-camera.service';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    HomeComponent,
    HeaderComponent,
    GameCardComponent,
    ScoreGameComponent,
    TeamEditModalComponent,
    EventLogComponent,
    RecordInstructionsComponent,
    QrModalComponent,
    LiveIndicatorComponent,
    ConfirmationModalComponent,
    DownloadVideoComponent,
    GameSetupComponent,
    VideoLibraryComponent,
    AdminDashboardComponent,
    FieldManagementComponent,
    ClubManagementComponent,
    UserManagementComponent,
    FieldCameraManagementComponent,
    MatchHistoryComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule
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
