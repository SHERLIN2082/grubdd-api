import { BadRequestException, Body, Controller, Post as HttpPost, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { AuthRequest } from '../../common/interfaces/auth-request.interface';

@Controller('media')
@ApiTags('Media')
@ApiBearerAuth()
export class MediaController {
  @HttpPost('image')
  async uploadImage(@Req() request: AuthRequest, @Body() body: { data?: string }) {
    if (!body?.data || !body.data.startsWith('data:image/')) {
      throw new BadRequestException('data must be an image data URL');
    }
    const match = body.data.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
    if (!match) throw new BadRequestException('Only png, jpeg, jpg, and webp images are supported');
    const [, extension, encoded] = match;
    const buffer = Buffer.from(encoded, 'base64');
    if (buffer.length > 10 * 1024 * 1024) throw new BadRequestException('Image must be 10 MB or smaller');
    const directory = join(process.cwd(), 'uploads', 'images');
    await mkdir(directory, { recursive: true });
    const filename = `${request.user.id}-${randomUUID()}.${extension === 'jpeg' ? 'jpg' : extension}`;
    await writeFile(join(directory, filename), buffer);
    return { url: `/uploads/images/${filename}` };
  }
}
