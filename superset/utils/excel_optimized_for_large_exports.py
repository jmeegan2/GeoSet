# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
"""Optimized XLSX generation for large, compatible DataFrames.

Pandas writes Excel data column-by-column, but XlsxWriter's constant-memory mode
requires rows to be written sequentially. This module provides that sequential
writer for supported exports over 250,000 rows. Smaller exports and DataFrames
with unsupported values, indexes, headers, or options retain pandas' standard
Excel writer behavior.
"""

import io
import math
from copy import deepcopy
from datetime import date, datetime, timedelta
from numbers import Number
from typing import Any

import pandas as pd

EXCEL_CONSTANT_MEMORY_ROW_THRESHOLD = 250_000
CONSTANT_MEMORY_EXCEL_OPTIONS = {
    "header",
    "index",
    "na_rep",
    "sheet_name",
    "startcol",
    "startrow",
}


def _is_supported_value(value: Any) -> bool:
    if value is None or value is pd.NA or value is pd.NaT:
        return True
    if isinstance(value, (str, bool, date, datetime, timedelta)):
        return True
    if isinstance(value, Number):
        return not isinstance(value, complex) and math.isfinite(value)
    return False


def can_use_optimized_excel_export(
    df: pd.DataFrame,
    excel_options: dict[str, Any],
) -> bool:
    if len(df) <= EXCEL_CONSTANT_MEMORY_ROW_THRESHOLD:
        return False
    if set(excel_options) - CONSTANT_MEMORY_EXCEL_OPTIONS:
        return False
    if isinstance(df.index, pd.MultiIndex) or isinstance(df.columns, pd.MultiIndex):
        return False
    if not all(_is_supported_value(value) for value in df.columns):
        return False
    if not isinstance(df.index, pd.RangeIndex) and not all(
        _is_supported_value(value) for value in df.index
    ):
        return False
    if any(
        df[column].isin([float("inf"), float("-inf")]).any()
        for column in df.select_dtypes(include="number").columns
    ):
        return False
    return all(
        _is_supported_value(value)
        for column in df.select_dtypes(include="object").columns
        for value in df[column]
    )


def df_to_optimized_excel(
    df: pd.DataFrame,
    writer_kwargs: dict[str, Any],
    excel_options: dict[str, Any],
) -> bytes:
    output = io.BytesIO()
    constant_memory_writer_kwargs = deepcopy(writer_kwargs)
    constant_memory_writer_kwargs.setdefault("engine_kwargs", {}).setdefault(
        "options", {}
    )["constant_memory"] = True
    sheet_name = excel_options.get("sheet_name", "Sheet1")
    include_index = excel_options.get("index", True)
    include_header = excel_options.get("header", True)
    startrow = excel_options.get("startrow", 0)
    startcol = excel_options.get("startcol", 0)
    na_rep = excel_options.get("na_rep", "")

    # pylint: disable=abstract-class-instantiated
    with pd.ExcelWriter(
        output, engine="xlsxwriter", **constant_memory_writer_kwargs
    ) as writer:
        worksheet = writer.book.add_worksheet(sheet_name)
        writer.sheets[sheet_name] = worksheet
        date_format = writer.book.add_format({"num_format": writer.date_format})
        datetime_format = writer.book.add_format({"num_format": writer.datetime_format})

        row_number = startrow
        if include_header:
            header = list(df.columns)
            if include_index:
                header.insert(0, df.index.name or "")
            worksheet.write_row(row_number, startcol, header)
            row_number += 1

        for index, values in zip(
            df.index,
            df.itertuples(index=False, name=None),
            strict=False,
        ):
            row = list(values)
            if include_index:
                row.insert(0, index)
            for column_number, value in enumerate(row, start=startcol):
                if pd.isna(value):
                    worksheet.write(row_number, column_number, na_rep)
                elif isinstance(value, pd.Timestamp):
                    worksheet.write_datetime(
                        row_number,
                        column_number,
                        value.to_pydatetime(),
                        datetime_format,
                    )
                elif isinstance(value, datetime):
                    worksheet.write_datetime(
                        row_number, column_number, value, datetime_format
                    )
                elif isinstance(value, date):
                    worksheet.write_datetime(
                        row_number, column_number, value, date_format
                    )
                else:
                    worksheet.write(row_number, column_number, value)
            row_number += 1

    return output.getvalue()
