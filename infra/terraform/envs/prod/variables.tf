variable "cloudflare_token" {
  type = string
}

variable "cloudflare_zone_id" {
  type = string
}

variable "cloudflare_account_id" {
  type = string
}

variable "vercel_token" {
  type = string
}

variable "vercel_team" {
  type = string
}

variable "planetscale_org" {
  type = string
}

variable "dns_records" {
  type = list(object({
    name    = string
    type    = string
    value   = string
    proxied = optional(bool)
    ttl     = optional(number)
  }))
}
