import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Home } from './home/home';
import { Lobby } from './lobby/lobby';

const routes: Routes = [
  {path: "", component: Home},
  {path: "lobby",component:Lobby}

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
