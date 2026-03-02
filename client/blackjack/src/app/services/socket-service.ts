import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket;

  constructor() {
    this.socket = io(environment.socketUrl);
  }

  getId() {
    return this.socket.id;
  }
  /**
   * Emits data with the specified event name.
   * @param event The event name.
   * @param data The data to emit.
   */
  emit(event: string, data: string) {
    this.socket.emit(event, data);
  }
  /**
   * Listen for a specific `event` and invoke the callback function.
   * @param event The event string to listen for.
   * @param callback The callback function to execute when event is triggered.
   */
  listenFor(event: string, callback: (data: string) => void) {
    this.socket.on(event, callback);
  }

  /**
   * Removes the listeners for the specified socket event.
   * @param event The event string to remove listenting
   */
  removeListener(event: string) {
    this.socket.off(event);
  }
}