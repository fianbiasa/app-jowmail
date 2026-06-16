import { createPostalClient, PostalSendOptions } from "@/lib/postal/client";
import { decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export interface SendViaOrganizationOptions extends PostalSendOptions {
  organizationId: string;
}

export async function sendViaOrganization(
  options: SendViaOrganizationOptions
) {
  const { organizationId, ...sendOptions } = options;

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization?.postalApiKey) {
    throw new Error("Organization does not have Postal API credentials");
  }

  // Decrypt API key
  let apiKey: string;
  if (organization.postalApiKeyIv) {
    apiKey = decrypt(organization.postalApiKey, organization.postalApiKeyIv);
  } else {
    // Legacy plaintext key (before encryption was added)
    apiKey = organization.postalApiKey;
  }

  const client = createPostalClient({
    baseUrl: organization.postalBaseUrl,
    apiKey,
  });

  return client.sendMessage(sendOptions);
}
