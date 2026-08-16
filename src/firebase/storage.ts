import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./config";

export async function uploadRiskAttachment(
  riskId: string,
  file: File
): Promise<string> {
  const path = `risks/${riskId}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function uploadChatImage(
  riskId: string,
  file: File
): Promise<string> {
  const path = `risk_messages/${riskId}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function uploadCorrespondenceAttachment(
  itemId: string,
  file: File
): Promise<string> {
  const path = `correspondence/${itemId}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function uploadCorrespondenceChatImage(
  itemId: string,
  file: File
): Promise<string> {
  const path = `correspondence_messages/${itemId}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function uploadDocumentFile(
  documentId: string,
  file: File
): Promise<string> {
  const path = `documents/${documentId}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function uploadDocumentChatImage(
  documentId: string,
  file: File
): Promise<string> {
  const path = `document_messages/${documentId}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
