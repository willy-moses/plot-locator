export interface Plot {
  id:    number;
  name:  string;
  lat:   number;
  lng:   number;
  color: string;
}

export interface RouteInfo {
  plotId:   number;
  plotName: string;
  distance: string;
  duration: string;
  destLat:  number;
  destLng:  number;
}

export interface NavStep {
  instruction:  string;
  distance:     number;   // metres to next maneuver
  duration:     number;   // seconds
  maneuverType: string;
  modifier:     string;
  lat:          number;   // maneuver point
  lng:          number;
}

export interface NominatimResult {
  place_id:     number;
  display_name: string;
  lat:          string;
  lon:          string;
}