import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { SupabaseService } from './supabase.service';
import { AuthGuard } from './auth.guard';
import { BlockchainService } from './blockchain.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AppController],
  providers: [SupabaseService, PrismaService, BlockchainService, AppService, AuthGuard],
})
export class AppModule {}
