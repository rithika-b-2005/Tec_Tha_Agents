// In-memory meeting store — persists across hot reloads via global

export interface MeetingData {
  id: string
  title: string
  description?: string
  date: string
  time: string
  location?: string
  classId?: string
  createdAt: string
}

declare global {
  // eslint-disable-next-line no-var
  var _aiMeetings: Map<string, MeetingData> | undefined
}

export const meetingStore: Map<string, MeetingData> =
  global._aiMeetings ?? (global._aiMeetings = new Map())

export function createMeeting(data: Omit<MeetingData, "createdAt">): MeetingData {
  const meeting: MeetingData = { ...data, createdAt: new Date().toISOString() }
  meetingStore.set(data.id, meeting)
  return meeting
}

export function getMeeting(id: string): MeetingData | undefined {
  return meetingStore.get(id)
}
