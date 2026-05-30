# Stage 1
## Core Actions
The notification system should support:
- View all notifications
- View unread notifications
- Mark notification as read
- Mark all notifications as read
- Delete notification
- Create notification
- Receive notifications in real time
## REST API Endpoints
### Get All Notifications
GET /api/notifications
Headers:
Authorization: Bearer token
Response:
```json
{
  "success": true,
  "notifications": [
    {
      "id": "n1",
      "studentId": 1042,
      "type": "Placement",
      "message": "Microsoft hiring",
      "isRead": false,
      "createdAt": "2026-05-30T10:00:00Z"
    }
  ]
}
```

### Get Unread Notifications

GET /api/notifications/unread

Headers:

Authorization: Bearer token

Response:

```json
{
  "success": true,
  "notifications": []
}
```
### Mark Notification as Read
PATCH /api/notifications/{id}/read
Response:
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```
### Mark All Notifications as Read
PATCH /api/notifications/read-all
Response:

```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```
### Delete Notification

DELETE /api/notifications/{id}
Response:
```json
{
  "success": true,
  "message": "Notification deleted"
}
```
### Create Notification
POST /api/notifications
Request:
```json
{
  "studentId": 1042,
  "type": "Placement",
  "message": "Apple hiring"
}
```
Response:
```json
{
  "success": true,
  "message": "Notification created"
}
```
## Real-Time Notification Mechanism

Real-time notifications can be implemented using WebSocket or Socket.IO. Whenever a new notification is created, the backend pushes it directly to the connected user without requiring a page refresh.

# Stage 2

## Database Selection

PostgreSQL is selected because it supports transactions, indexing, structured relationships, scalability, and reliable storage.

## Database Schema

### Students Table

```sql
CREATE TABLE students (
  studentID INT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(150) UNIQUE
);
```

### Notifications Table

```sql
CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  studentID INT REFERENCES students(studentID),
  notificationType notification_type NOT NULL,
  message TEXT NOT NULL,
  isRead BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Problems as Data Grows

- Slow queries
- High storage usage
- Increased database load
- Slower sorting and filtering

## Solutions

- Indexing
- Pagination
- Redis caching
- Archiving old data
- Table partitioning

## Sample Queries

### Get Notifications

```sql
SELECT *
FROM notifications
WHERE studentID = 1042
ORDER BY createdAt DESC
LIMIT 20;
```

### Get Unread Notifications

```sql
SELECT *
FROM notifications
WHERE studentID = 1042
AND isRead = false
ORDER BY createdAt DESC;
```

### Mark As Read

```sql
UPDATE notifications
SET isRead = true
WHERE id = 1;
```

### Delete Notification

```sql
DELETE FROM notifications
WHERE id = 1;
```

# Stage 3

The query is logically correct because it fetches unread notifications for a specific student.

```sql
SELECT *
FROM notifications
WHERE studentID = 1042
AND isRead = false
ORDER BY createdAt DESC;
```

## Why It Is Slow

- The table contains millions of rows.
- The database may scan a large number of records.
- Sorting without proper indexing is expensive.

## Optimization

Create a composite index:

```sql
CREATE INDEX idx_notifications_student_read_created
ON notifications(studentID, isRead, createdAt DESC);
```

This reduces query cost significantly because the database can directly access matching rows in sorted order.

## Should We Add Indexes On Every Column?

No.

Reasons:

- Increased storage usage
- Slower inserts and updates
- Many indexes may never be used

Indexes should only be created for frequently searched columns.

## Placement Notification Query

```sql
SELECT DISTINCT studentID
FROM notifications
WHERE notificationType = 'Placement'
AND createdAt >= NOW() - INTERVAL '7 days';
```
# Stage 4
Fetching notifications on every page load can overload the database.

## Improvements

- Redis caching
- Pagination
- Infinite scrolling
- WebSockets
- Read replicas

## Tradeoffs
### Redis
Pros:
- Fast retrieval
Cons:
- Cache invalidation complexity
### Pagination
Pros:
- Reduces data transfer
Cons:
- Requires multiple requests
### WebSocket
Pros:
- Real-time updates
Cons:
- Persistent connections required

### Read Replicas
Pros:
- Better read performance
Cons:
- Additional infrastructure cost
# Stage 5
## Problems In Current Implementation

- Sequential processing
- Slow execution
- No retry mechanism
- Email failures affect reliability
- Difficult to scale
## Better Design
Use
- Message Queue (RabbitMQ/Kafka)
- Background Workers
- Retry Mechanism
- Dead Letter Queue

Save notifications in the database first, then process email and app notifications asynchronously.
## Revised Pseudocode
```text
function notifyAll(studentIds, message):
    for each studentId:
        saveNotification(studentId, message)
        addToEmailQueue(studentId, message)
        addToAppQueue(studentId, message)
emailWorker:
    sendEmail()
    if failed:
        retry
    if still failed:
        moveToDeadLetterQueue()
appWorker:
    pushNotification()
```
If email fails for 200 students, failed jobs should be retried automatically
# Stage 6
## Priority Rules
Placement = 3
Result = 2
Event = 1
## Sorting Logic
Notifications are sorted by:
1. Priority
2. Recency
Higher priority notifications appear first. If priorities are equal, the latest notification appears first.
## Efficient Top 10 Maintenance
Use a Min Heap of size 10
When a new notification arrives:
- Compare it with the lowest priority notification.
- Replace if higher priority.
- Maintain heap size at 10.

This provides efficient maintenance of top notifications while handling continuous incoming data.
The implementation is provided in:

```text
priorityNotifications.js
```
