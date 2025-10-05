import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { GameSetupComponent } from './components/game-setup/game-setup.component';
import { ScoreGameComponent } from './components/score-game/score-game.component';
import { RecordInstructionsComponent } from './components/record-instructions/record-instructions.component';
import { DownloadVideoComponent } from './components/download-video/download-video.component';
import { VideoLibraryComponent } from './components/video-library/video-library.component';
import { MediaLibraryComponent } from './components/media-library/media-library.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { GuestGuard } from './guards/guest.guard';
import { InitialRedirectGuard } from './guards/initial-redirect.guard';
import { MatchHistoryComponent } from './components/match-history/match-history.component';

const routes: Routes = [
  { path: '', canActivate: [InitialRedirectGuard], children: [] },
  { path: 'login', component: LoginComponent, canActivate: [GuestGuard] },
  { path: 'home', component: HomeComponent }, // Removed auth guard to allow guest access
  { path: 'game-setup', component: GameSetupComponent },
  { path: 'score-game', component: ScoreGameComponent },
  { path: 'record-instructions', component: RecordInstructionsComponent },
  { path: 'download-video', component: DownloadVideoComponent },
  { path: 'download-video/:gameId', component: DownloadVideoComponent },
  { path: 'match-history', component: MatchHistoryComponent },
  { path: 'media-library/:matchCode', component: MediaLibraryComponent },
  { path: 'media-library/recording-code/:recordingCode', component: MediaLibraryComponent },
  { path: 'video-library/:matchCode', redirectTo: 'media-library/:matchCode' },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [AdminGuard] },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [GuestGuard, InitialRedirectGuard]
})
export class AppRoutingModule { }
