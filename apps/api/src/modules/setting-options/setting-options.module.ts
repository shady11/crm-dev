import {Module} from "@nestjs/common";
import {SettingOptionsController} from "./setting-options.controller";
import {SettingOptionsService} from "./setting-options.service";

@Module({
    controllers: [SettingOptionsController],
    providers: [SettingOptionsService],
    exports: [SettingOptionsService],
})
export class SettingOptionsModule {}
