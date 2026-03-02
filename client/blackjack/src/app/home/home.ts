import { Component } from '@angular/core';
import { SocketService } from '../services/socket-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  username: string = "";

  constructor(
    private socket: SocketService,
    private router: Router

  ) {}

  onPlay() {
    if (this.username === undefined || this.username.trim() === "") {
      return;
    }
    
    this.socket.emit("userJoin", JSON.stringify({
      name: this.username,
      id: this.socket.getId()
    }));

    this.router.navigate(['/lobby'])
  }
}
