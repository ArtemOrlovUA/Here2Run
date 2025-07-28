export interface GPSStatus {
  permission: 'granted' | 'denied' | 'not-requested';
  servicesEnabled: boolean;
  canAskAgain: boolean;
}
