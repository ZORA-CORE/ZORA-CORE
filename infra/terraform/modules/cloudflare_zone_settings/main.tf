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

resource "cloudflare_zone_settings_override" "this" {
  zone_id = var.zone_id
  settings {
    always_use_https = "on"
    brotli           = "on"
    min_tls_version  = "1.3"
    http3            = "on"
    tls_1_3          = "on"
  }
}

resource "cloudflare_ruleset" "waf" {
  zone_id = var.zone_id
  name    = "zoracore-waf"
  kind    = "zone"
  phase   = "http_request_firewall_custom"

  rules {
    action = "block"
    expression = "(http.request.method in {\"TRACE\", \"TRACK\"})"
    description = "Block trace/track"
  }
}
