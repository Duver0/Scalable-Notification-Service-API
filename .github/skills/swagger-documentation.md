# Skill: Swagger / OpenAPI Documentation

## Purpose
Ensure every public API endpoint is documented with OpenAPI-compliant annotations. Documentation is generated from decorators at compile time, kept in sync with the code, and accessible via Swagger UI.

## Rules

### Required Annotations per Endpoint
```typescript
@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  @Post()
  @ApiOperation({ summary: 'Send a notification', description: 'Creates and queues a notification for delivery' })
  @ApiCreatedResponse({ type: NotificationResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async create(@Body() dto: CreateNotificationDto): Promise<NotificationResponseDto> { ... }
}
```

### DTO Documentation
```typescript
export class CreateNotificationDto {
  @ApiProperty({ example: 'user_abc123', description: 'Recipient user ID' })
  @IsUUID()
  recipientId: string;

  @ApiProperty({ example: 'email', enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({ example: 'Your order has shipped!', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  message: string;
}
```

### Documentation Rules
1. **Every public endpoint** must have `@ApiOperation` with summary and description
2. **Every DTO property** must have `@ApiProperty` with example, description, and required/optional
3. **Every error response** must be documented (`@ApiBadRequestResponse`, `@ApiNotFoundResponse`, etc.)
4. **Authentication** must be documented at the controller level with `@ApiBearerAuth()`
5. **Enums** must use `@ApiProperty({ enum: EnumType })`, not string examples
6. **Pagination** responses must use a generic `PaginatedResponseDto<T>` with proper `@ApiProperty`

### Swagger Setup
```typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle('Notification Service API')
  .setDescription('Scalable notification service with multi-channel delivery')
  .setVersion(process.env.npm_package_version || '1.0.0')
  .addBearerAuth()
  .addServer(process.env.API_BASE_URL || 'http://localhost:3000')
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

## Anti-Patterns
- Missing `@ApiProperty` on DTO fields (generates broken or missing schema)
- Using `@ApiHideProperty` to hide fields that should be documented differently
- Documenting every possible error response with the same generic description
- Leaving `example` values empty or using placeholder text like "string"
- Not updating documentation when DTOs change (doc rot)
- Adding Swagger decorators to domain entities (they belong on DTOs)

## Best Practices
- Use `@ApiProperty({ deprecated: true })` instead of removing fields immediately (support migration period)
- Group related endpoints with `@ApiTags` (one tag per module/controller)
- Use `@ApiQuery` for query parameters on GET endpoints (pagination, filters)
- Use `@ApiParam` for path parameters with descriptive examples
- Configure `SwaggerDocumentOptions` to include `deepScanRoutes: true`
- Hide health check and internal endpoints with `@ApiExcludeEndpoint(true)` if they shouldn't be public
- Generate a static `openapi.json` in CI for external consumers and contract testing
