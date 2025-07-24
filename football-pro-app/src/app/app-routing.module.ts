import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { GameSetupComponent } from './components/game-setup/game-setup.component';
import { ScoreGameComponent } from './components/score-game/score-game.component';
import { RecordInstructionsComponent } from './components/record-instructions/record-instructions.component';
import { DownloadVideoComponent } from './components/download-video/download-video.component';
import { SelectedMomentsComponent } from './components/selected-moments/selected-moments.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'home', component: HomeComponent }, // Removed auth guard to allow guest access
  { path: 'game-setup', component: GameSetupComponent },
  { path: 'score-game', component: ScoreGameComponent },
  { path: 'record-instructions', component: RecordInstructionsComponent },
  { path: 'download-video', component: DownloadVideoComponent },
  { path: 'download-video/:gameId', component: DownloadVideoComponent },
  { path: 'selected-moments/:matchCode', component: SelectedMomentsComponent },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
