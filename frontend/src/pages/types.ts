export type LogFileResponse = {
  id: string
  original_filename: string
  size_bytes: number
  uploaded_at: string
  source_type: string
}

export type DecoderSummary = {
  id: string
  name: string
  kind: string
  size_bytes: number
  uploaded_at: string | null
}

export type DecodeRow = {
  status: string
  devaddr: string | null
  fcnt: number | null
  fport: number | null
  time: string | null
  payload_hex: string | null
  decoded_json: unknown | null
  error: string | null
}

export type ReplayRow = {
  status: string
  gateway_eui: string | null
  frequency: number | null
  size: number | null
  message: string
}

export type GenerateRequest = {
  gateway_eui: string
  devaddr: string
  frames: number
  interval_seconds: number
  start_time: string | null
  frequency_mhz: number
  datarate: string
  coding_rate: string
  payload_hex: string | null
  filename: string | null
}

export type DeviceCredential = {
  id: string
  devaddr: string
  device_name: string | null
  nwkskey: string
  appskey: string
}

export type AdminUser = {
  id: string
  email: string
  role: string
  is_active: boolean
  created_at: string
  updated_at: string
}
