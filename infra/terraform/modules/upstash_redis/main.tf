terraform {
  required_providers {
    upstash = {
      source  = "upstash/upstash"
      version = "1.5.3"
    }
  }
}

variable "databases" {
  type = list(object({
    name   = string
    region = string
  }))
}

resource "upstash_redis_database" "this" {
  for_each = { for db in var.databases : db.name => db }
  database_name = each.value.name
  region        = each.value.region
  tls           = true
}
