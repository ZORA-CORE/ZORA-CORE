terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "4.30.0"
    }
  }
}

variable "account_id" {
  type = string
}

variable "buckets" {
  type = list(object({
    name        = string
    jurisdiction = string
  }))
}

resource "cloudflare_r2_bucket" "this" {
  for_each = { for bucket in var.buckets : bucket.name => bucket }
  account_id = var.account_id
  name       = each.value.name
  location   = each.value.jurisdiction
}
