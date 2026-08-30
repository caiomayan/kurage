output "backend_public_ip" {
  description = "Reserved public IPv4 address used by api.caiomayan.com."
  value       = oci_core_public_ip.backend.ip_address
}

output "backend_instance_id" {
  description = "OCI instance OCID."
  value       = oci_core_instance.backend.id
}

output "ssh_command" {
  description = "Administrative SSH command. Network exposure follows allow_github_hosted_ssh_deploy."
  value       = "ssh kurage@${oci_core_public_ip.backend.ip_address}"
}

output "dns_records" {
  description = "DNS records to configure after the first apply."
  value = {
    backend  = "${var.api_domain} A ${oci_core_public_ip.backend.ip_address}"
    frontend = "${var.frontend_domain} CNAME <exact target shown by Vercel>"
  }
}
