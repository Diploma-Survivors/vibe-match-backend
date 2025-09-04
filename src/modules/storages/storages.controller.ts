import { Controller, Get, Body, Patch, Param, Delete } from '@nestjs/common';
import { StoragesService } from './storages.service';
import { UpdateStorageDto } from './dto/update-storage.dto';

@Controller('storages')
export class StoragesController {
  constructor(private readonly storagesService: StoragesService) {}

  @Get()
  findAll() {
    return this.storagesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.storagesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStorageDto: UpdateStorageDto) {
    return this.storagesService.update(+id, updateStorageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.storagesService.remove(+id);
  }
}
