terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "4.30.0"
    }
  }
}

variable "zone_id" {
  type = string
}

variable "records" {
  type = list(object({
    name    = string
    type    = string
    value   = string
    proxied = optional(bool, true)
    ttl     = optional(number, 1)
  }))
}

resource "cloudflare_record" "this" {
  for_each = { for record in var.records : "${record.name}-${record.type}" => record }
  zone_id  = var.zone_id
  name     = each.value.name
  type     = each.value.type
  value    = each.value.value
  proxied  = lookup(each.value, "proxied", true)
  ttl      = lookup(each.value, "ttl", 1)
}
